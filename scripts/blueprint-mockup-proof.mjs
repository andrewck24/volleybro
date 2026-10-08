import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import path from "node:path";

import { readFile, stat } from "node:fs/promises";
import { hasDesignMockup, validateArtifact } from "./blueprint-preview.js";

const input = {
  sourceSha: process.env.INPUT_SOURCE_SHA,
  integrationSha: process.env.INPUT_INTEGRATION_SHA,
  storeSha: process.env.INPUT_STORE_SHA,
  slug: process.env.INPUT_SLUG,
  inputHash: process.env.INPUT_HASH,
};
for (const [name, value] of Object.entries(input)) {
  assert.ok(value, `${name} is required`);
}
assert.match(
  input.sourceSha,
  /^[0-9a-f]{40}$/u,
  "sourceSha must be a full SHA",
);
assert.match(
  input.integrationSha,
  /^[0-9a-f]{40}$/u,
  "integrationSha must be a full SHA",
);
assert.match(input.storeSha, /^[0-9a-f]{40}$/u, "storeSha must be a full SHA");
assert.match(input.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "slug is malformed");
assert.match(
  input.inputHash,
  /^[0-9a-f]{64}$/u,
  "inputHash must be a SHA-256 hash",
);

const artifactPath = process.env.PREVIEW_ARTIFACT_DIR;
assert.ok(artifactPath, "PREVIEW_ARTIFACT_DIR is required");
const candidatePath = process.env.CANDIDATE_SOURCE_DIR;
assert.ok(candidatePath, "CANDIDATE_SOURCE_DIR is required");
const artifactDirectory = path.resolve(artifactPath);
const candidateDirectory = path.resolve(candidatePath);
const candidateBlueprint = path.join(candidateDirectory, "blueprint");

await validateArtifact(artifactDirectory, input);
assert.equal(
  await hasDesignMockup(candidateDirectory, input.slug),
  true,
  "the requested source snapshot must contain a regular design.tsx",
);

const expectedIdentity = [
  input.sourceSha,
  input.integrationSha,
  input.storeSha,
  input.inputHash,
].join(":");
const exportedPage = path.join(
  artifactDirectory,
  "changes",
  `${input.slug}.html`,
);
const staticMarkup = await readFile(exportedPage, "utf8");
assert.ok(
  staticMarkup.includes("載入設計稿…"),
  "the exact exported route must contain the client-only MockupFrame loader",
);
assert.ok(
  staticMarkup.includes(`data-blueprint-build-identity="${expectedIdentity}"`),
  "the exact exported route must carry the requested source, integration, store and input identity",
);
assert.equal(
  staticMarkup.includes('data-blueprint-mockup-mounted="true"'),
  false,
  "the mount marker must be client-rendered, not present in static HTML",
);

const requireFromCandidate = createRequire(
  path.join(candidateBlueprint, "package.json"),
);
const { chromium } = requireFromCandidate("@playwright/test");
const pageErrors = [];
const consoleErrors = [];
const browser = await chromium.launch();
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);
const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://127.0.0.1").pathname,
    );
  } catch {
    response.writeHead(400).end();
    return;
  }

  // Cloudflare Workers Static Assets defaults to serving /file.html at /file.
  const relativePath =
    pathname === `/changes/${input.slug}`
      ? `changes/${input.slug}.html`
      : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(artifactDirectory, relativePath);
  if (!filePath.startsWith(`${artifactDirectory}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-length": body.length,
      "content-type":
        contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
});

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const page = await browser.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const routeUrl = `http://127.0.0.1:${address.port}/changes/${input.slug}`;
  const response = await page.goto(routeUrl, { waitUntil: "load" });
  assert.equal(
    response?.status(),
    200,
    "the exact exported Change route must load",
  );
  assert.equal(
    new URL(page.url()).pathname,
    `/changes/${input.slug}`,
    "the browser must keep the canonical extensionless route",
  );

  const identity = page.locator("[data-blueprint-build-identity]");
  await identity.waitFor({ state: "visible" });
  assert.equal(
    await identity.count(),
    1,
    "the route must render one identity marker",
  );
  assert.equal(
    await identity.getAttribute("data-blueprint-build-identity"),
    expectedIdentity,
    "the rendered route must match the validated build receipt",
  );

  const mounted = page.locator('[data-blueprint-mockup-mounted="true"]');
  await mounted.waitFor({ state: "attached", timeout: 20_000 });
  assert.equal(
    await mounted.count(),
    1,
    "MockupFrame must reach its mounted branch",
  );
  const loader = page.getByText("載入設計稿…", { exact: true });
  await loader.waitFor({ state: "detached", timeout: 20_000 });
  assert.equal(await loader.count(), 0, "the initial loader must disappear");
  await page.waitForLoadState("networkidle", { timeout: 20_000 });
  assert.equal(
    await page
      .getByText("此設計稿在此 checkout 中無法顯示", { exact: false })
      .count(),
    0,
    "MockupFrame must not show its error fallback",
  );
  assert.deepEqual(pageErrors, [], "the route must not emit JavaScript errors");
  assert.deepEqual(consoleErrors, [], "the route must not emit console errors");

  console.log(
    `Client mockup mounted for ${expectedIdentity} at /changes/${input.slug}`,
  );
} finally {
  await browser.close();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
