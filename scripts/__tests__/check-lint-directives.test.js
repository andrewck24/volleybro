import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { initRepository } from "../../test/support/git-fixture.js";

const script = fileURLToPath(
  new URL("../check-lint-directives.js", import.meta.url),
);

test("lint directives fail independently of Oxlint suppression", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "lint-directives-"));
  t.after(() => rmSync(directory, { force: true, recursive: true }));
  initRepository(directory);
  const runGuard = () =>
    spawnSync(process.execPath, [script], {
      cwd: directory,
      encoding: "utf8",
    });
  const file = join(directory, "sample.ts");

  for (const source of [
    "/* oxlint-disable */\nexport const value = 1;",
    "export const value = 1; // oxlint-disable-line local/no-comments",
    "// eslint-disable-next-line\nexport const value = 1;",
  ]) {
    writeFileSync(file, source);
    const result = runGuard();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Inline lint directives are not allowed/);
  }

  writeFileSync(file, 'export const text = "/* oxlint-disable */";');
  const result = runGuard();
  assert.equal(result.status, 0, result.stderr);

  for (const name of ["sample.js", "sample.mjs", "sample.cjs"]) {
    const jsx = join(directory, name);
    writeFileSync(jsx, "const element = <div />; /* oxlint-disable-line */");
    const jsxResult = runGuard();
    assert.equal(jsxResult.status, 1);
    assert.ok(
      jsxResult.stderr.includes(
        `${name}:1: Inline lint directives are not allowed.`,
      ),
    );
  }
});
