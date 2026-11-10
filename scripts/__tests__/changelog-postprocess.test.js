import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.changeset/changelog-postprocess.js",
);

test("version header compares against the previous changelog version, not git tags", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "changelog-"));
  try {
    fs.mkdirSync(path.join(root, ".changeset"));
    fs.copyFileSync(script, path.join(root, ".changeset/postprocess.js"));
    fs.writeFileSync(
      path.join(root, "package.json"),
      '{"type":"module","version":"0.19.2"}',
    );
    fs.writeFileSync(
      path.join(root, "CHANGELOG.md"),
      [
        "# volleybro",
        "",
        "## 0.19.2",
        "",
        "### Fixed",
        "",
        "- A fix.",
        "",
        "## [0.19.1](https://github.com/o/r/compare/v0.19.0...v0.19.1) 2026-11-10",
        "",
        "### Fixed",
        "",
        "- Older fix.",
        "",
      ].join("\n"),
    );

    execFileSync("node", [path.join(root, ".changeset/postprocess.js")], {
      cwd: root,
    });

    assert.match(
      fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8"),
      /^## \[0\.19\.2\]\(https:\/\/github\.com\/andrewck24\/volleybro\/compare\/v0\.19\.1\.\.\.v0\.19\.2\)/m,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
