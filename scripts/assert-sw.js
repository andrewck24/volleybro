#!/usr/bin/env node
import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";

let meta, body;
try {
  const workers = globSync([
    ".next/server/app/serwist/sw.js.meta",
    ".next/server/route-cache/APP_ROUTE/*/$/serwist/sw.js.meta",
  ]);
  assert.equal(workers.length, 1, "expected exactly one built worker");
  meta = JSON.parse(readFileSync(workers[0], "utf8"));
  body = readFileSync(workers[0].replace(/\.meta$/, ".body"), "utf8");
} catch (err) {
  console.error(
    `assert-sw: could not read the built worker (${err.message}). ` +
      "Run `next build` first.",
  );
  process.exit(1);
}

assert.equal(
  meta.headers?.["content-type"],
  "application/javascript",
  "worker content-type must be application/javascript",
);
assert.equal(
  meta.headers?.["service-worker-allowed"],
  "/",
  'worker must be served with service-worker-allowed "/"',
);

const urls = [
  ...new Set([...body.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1])),
];
assert.ok(urls.length > 0, "precache manifest is empty");

const navDocs = urls.filter((u) => !u.split("/").pop().includes("."));
assert.deepEqual(
  navDocs,
  [],
  `precache must not contain navigation documents, found: ${navDocs.join(", ")}`,
);

assert.ok(
  urls.some((u) => u.startsWith("/_next/static/")),
  "precache must contain build chunks (/_next/static)",
);
assert.ok(
  urls.some((u) => /\.(png|svg|ico|json|webmanifest)$/.test(u)),
  "precache must contain public assets",
);

console.log(
  `assert-sw: OK — headers baked, ${urls.length} precache entries, no navigation documents.`,
);
