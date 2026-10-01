import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(
  new URL("../dependency-controls.js", import.meta.url),
);

test("native dual-document patch assessment rejects expanded or tampered dependency changes", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "dependency-owner-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "blueprint"));
  const manifest = {
    name: "volleybro",
    version: "1.0.0",
    packageManager: "pnpm@12.8.1",
    devDependencies: { "@types/jest-axe": "3.5.8" },
  };
  writeFileSync(path.join(root, "package.json"), JSON.stringify(manifest));
  writeFileSync(
    path.join(root, "blueprint/package.json"),
    JSON.stringify({ name: "blueprint", version: "1.0.0" }),
  );
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - '.'\n  - blueprint\n",
  );
  const install = () =>
    execFileSync(
      "pnpm",
      ["install", "--lockfile-only", "--ignore-scripts", "--ignore-pnpmfile"],
      {
        cwd: root,
        env: { ...process.env, CI: "true", HUSKY: "0" },
        stdio: "pipe",
      },
    );
  install();
  const before = Object.fromEntries(
    [
      "package.json",
      "blueprint/package.json",
      "pnpm-workspace.yaml",
      "pnpm-lock.yaml",
    ].map((file) => [file, readFileSync(path.join(root, file), "utf8")]),
  );
  manifest.devDependencies["@types/jest-axe"] = "3.5.9";
  writeFileSync(path.join(root, "package.json"), JSON.stringify(manifest));
  install();
  const after = Object.fromEntries(
    ["package.json", "pnpm-lock.yaml"].map((file) => [
      file,
      readFileSync(path.join(root, file), "utf8"),
    ]),
  );
  const run = (candidate) => {
    const payload = path.join(root, "assessment.json");
    writeFileSync(payload, JSON.stringify({ before, after: candidate }));
    return spawnSync(process.execPath, [cli, "validate-files", payload], {
      encoding: "utf8",
    });
  };
  const positive = run(after);
  assert.equal(positive.status, 0, positive.stderr);
  assert.match(positive.stdout, /@types\/jest-axe/);
  for (const [change, reason] of [
    [{ devDependencies: { "@types/jest-axe": "4.0.0" } }, /stable patch/],
    [{ devDependencies: { "@types/jest-axe": "3.6.0" } }, /stable patch/],
    [
      { devDependencies: { "@types/jest-axe": "3.5.9", eslint: "9.0.1" } },
      /one allowlisted/,
    ],
    [{ dependencies: { "better-auth": "1.7.3" } }, /additional changes/],
    [{ scripts: { postinstall: "echo unsafe" } }, /additional changes/],
  ]) {
    const result = run({
      ...after,
      "package.json": JSON.stringify({ ...manifest, ...change }),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, reason);
  }
  const environment = run({
    ...after,
    "pnpm-lock.yaml": after["pnpm-lock.yaml"].replace("12.8.1", "12.8.2"),
  });
  assert.equal(environment.status, 1);
  assert.match(environment.stderr, /environment changed/);
  const integrity = run({
    ...after,
    "pnpm-lock.yaml": after["pnpm-lock.yaml"].replace(
      /('@types\/jest-axe@3\.5\.9':\s+resolution: \{integrity: )[^}]+/,
      "$1sha512-tampered",
    ),
  });
  assert.equal(integrity.status, 1);
  assert.match(integrity.stderr, /native regeneration/);

  const sha = "a".repeat(40);
  const bot = { id: 49699333, login: "dependabot[bot]", type: "Bot" };
  const state = {
    pr: {
      number: 7,
      user: bot,
      state: "open",
      draft: false,
      merged: false,
      head: {
        sha,
        ref: "dependabot/npm_and_yarn/types/jest-axe-3.5.9",
        repo: { full_name: "owner/repo" },
      },
      base: {
        ref: "main",
        sha: "b".repeat(40),
        repo: { full_name: "owner/repo" },
      },
    },
    commits: [
      { sha, author: bot, commit: { verification: { verified: true } } },
    ],
    files: ["package.json", "pnpm-lock.yaml"].map((filename) => ({
      filename,
      status: "modified",
      changes: 8,
    })),
    checks: [
      {
        name: "Verify",
        head_sha: sha,
        app: { id: 15368 },
        status: "completed",
        conclusion: "success",
        started_at: "2026-10-02T00:00:00Z",
      },
    ],
    statuses: [{ context: "Vercel", sha, state: "success" }],
    required: [{ bucket: "pass" }],
    view: { mergeStateStatus: "CLEAN", headRefOid: sha },
    before,
    after,
  };
  mkdirSync(path.join(root, "bin"));
  const apiFile = path.join(root, "api.json");
  const gh = path.join(root, "bin", "gh");
  writeFileSync(
    gh,
    `#!/usr/bin/env node
const fs = require('node:fs');
const s = JSON.parse(fs.readFileSync(process.env.TEST_API));
const a = process.argv.slice(2);
let value;
if (a[0] === 'pr') value = a[1] === 'checks' ? s.required : s.view;
else {
 const p = a[1].replace('repos/owner/repo/', '');
 if (p.startsWith('pulls?')) value = [s.pr];
 else if (p === 'pulls/7') value = s.pr;
 else if (p.includes('/commits?')) value = s.commits;
 else if (p.includes('/files?')) value = s.files;
 else if (p.includes('/check-runs?')) value = {check_runs: s.checks};
 else if (p.includes('/statuses?')) value = s.statuses;
 else if (p.startsWith('contents/')) {
  const u = new URL('https://example.invalid/' + p);
  const f = u.pathname.slice('/contents/'.length);
  value = {content: Buffer.from((u.searchParams.get('ref') === s.pr.head.sha ? s.after : s.before)[f]).toString('base64')};
 } else throw Error('Unexpected API: ' + p);
 if (a.includes('--slurp')) value = [value];
}
process.stdout.write(JSON.stringify(value));
`,
  );
  chmodSync(gh, 0o755);
  const inspect = (candidate) => {
    writeFileSync(apiFile, JSON.stringify(candidate));
    const output = path.join(root, "github-output");
    writeFileSync(output, "");
    const result = spawnSync(process.execPath, [cli, "inspect"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
        TEST_API: apiFile,
        GITHUB_REPOSITORY: "owner/repo",
        DEPENDENCY_HEAD_SHA: sha,
        GITHUB_OUTPUT: output,
      },
    });
    return { ...result, output: readFileSync(output, "utf8") };
  };
  const eligible = inspect(state);
  assert.equal(eligible.status, 0, eligible.stderr);
  assert.equal(eligible.output, `number=7\nsha=${sha}\n`);
  for (const [alter, reason] of [
    [
      (s) => {
        s.pr.user.id = 123;
      },
      /trusted active/,
    ],
    [
      (s) => {
        s.pr.head.repo.full_name = "attacker/repo";
      },
      /trusted active/,
    ],
    [
      (s) => {
        s.commits[0].commit.verification.verified = false;
      },
      /signed single/,
    ],
    [
      (s) => {
        s.files.push({ filename: "scripts/unsafe.js", changes: 1 });
      },
      /Expanded/,
    ],
    [
      (s) => {
        s.checks[0].app.id = 0;
      },
      /Latest Verify/,
    ],
    [
      (s) => {
        s.checks.push({
          ...s.checks[0],
          started_at: "2026-10-02T01:00:00Z",
          conclusion: "failure",
        });
      },
      /Latest Verify/,
    ],
    [
      (s) => {
        s.statuses[0].state = "failure";
      },
      /Latest Vercel/,
    ],
    [
      (s) => {
        s.required[0].bucket = "fail";
      },
      /Required checks/,
    ],
    [
      (s) => {
        s.view.headRefOid = "c".repeat(40);
      },
      /stale or blocked/,
    ],
  ]) {
    const candidate = structuredClone(state);
    alter(candidate);
    const denied = inspect(candidate);
    assert.equal(denied.status, 1);
    assert.equal(denied.output, "");
    assert.match(denied.stderr, reason);
  }
});
