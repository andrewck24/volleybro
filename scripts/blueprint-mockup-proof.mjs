import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

import { readFile } from "node:fs/promises";
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
const baseUrlInput = process.env.MOCKUP_PROOF_BASE_URL;
assert.ok(baseUrlInput, "MOCKUP_PROOF_BASE_URL is required");
const baseUrl = new URL(baseUrlInput);
assert.equal(baseUrl.protocol, "http:", "the proof server must use HTTP");
assert.equal(baseUrl.hostname, "127.0.0.1", "the proof server must be local");

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

try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const routeUrl = new URL(`/changes/${input.slug}`, baseUrl).href;
  await page.route(routeUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: staticMarkup,
    }),
  );
  const response = await page.goto(routeUrl, { waitUntil: "load" });
  assert.equal(
    response?.status(),
    200,
    "the exact exported Change route must load",
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
}
