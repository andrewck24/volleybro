import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../assert-sw.js", import.meta.url));
const legacy = ".next/server/app/serwist/sw.js";
const cached = ".next/server/route-cache/APP_ROUTE/owner/$/serwist/sw.js";

function check(paths, headers, body) {
  const cwd = mkdtempSync(join(tmpdir(), "assert-sw-"));
  try {
    for (const path of paths) {
      const target = join(cwd, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(`${target}.meta`, JSON.stringify({ headers }));
      writeFileSync(`${target}.body`, body);
    }
    return spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const headers = {
  "content-type": "application/javascript",
  "service-worker-allowed": "/",
};
const assets = 'url: "/_next/static/chunk.js", url: "/icon.png"';

for (const path of [legacy, cached]) {
  test(`accepts a generated worker at ${path}`, () => {
    const result = check([path], headers, assets);
    assert.equal(result.status, 0, result.stderr);
  });
}

test("rejects missing or ambiguous worker outputs", () => {
  for (const paths of [[], [legacy, cached]]) {
    const result = check(paths, headers, assets);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exactly one built worker/);
  }
});

test("retains scope and navigation precache guards in the new layout", () => {
  const scope = check(
    [cached],
    { ...headers, "service-worker-allowed": "/serwist" },
    assets,
  );
  assert.notEqual(scope.status, 0);
  assert.match(scope.stderr, /worker must be served/);
  const navigation = check([cached], headers, `${assets}, url: "/home"`);
  assert.notEqual(navigation.status, 0);
  assert.match(
    navigation.stderr,
    /precache must not contain navigation documents/,
  );
});
