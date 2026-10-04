import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../blueprint-preview.js", import.meta.url));
const SOURCE_SHA = "1".repeat(40);
const STORE_SHA = "2".repeat(40);
const INTEGRATION_SHA = "3".repeat(40);
const INPUT_HASH = "4".repeat(64);
const REQUEST_ID = "019c0000-0000-7000-8000-000000000001";
const SLUG = "preview-test";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-preview-test-"));
  const artifact = path.join(root, "artifact");
  const bin = path.join(root, "bin");
  await mkdir(artifact, { recursive: true });
  await mkdir(bin, { recursive: true });
  await writeFile(path.join(artifact, "index.html"), "<main>preview</main>\n");
  await writeFile(
    path.join(artifact, "blueprint-build.json"),
    JSON.stringify({
      schemaVersion: 1,
      sourceSha: SOURCE_SHA,
      storeSha: STORE_SHA,
      integrationSha: INTEGRATION_SHA,
      sourceDirty: false,
      changeInputHashes: { [SLUG]: INPUT_HASH },
    }),
  );
  const fakeGit = path.join(bin, "git");
  await writeFile(
    fakeGit,
    "#!/usr/bin/env node\n" +
      "process.stdout.write(`${process.env.CURRENT_BRANCH_SHA}\\trefs/heads/${process.env.INPUT_BRANCH}\\n`);\n" +
      "if (process.env.EXTRA_BRANCH) process.stdout.write(`${process.env.CURRENT_BRANCH_SHA}\\trefs/heads/${process.env.EXTRA_BRANCH}\\n`);\n",
  );
  await chmod(fakeGit, 0o755);
  const env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    INPUT_SOURCE_SHA: SOURCE_SHA,
    INPUT_STORE_SHA: STORE_SHA,
    INPUT_INTEGRATION_SHA: INTEGRATION_SHA,
    INPUT_BRANCH: "feat/preview-test",
    INPUT_SLUG: SLUG,
    INPUT_HASH,
    INPUT_REQUEST_ID: REQUEST_ID,
    GITHUB_REPOSITORY: "andrewck24/volleybro",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    PREVIEW_ARTIFACT_DIR: artifact,
    CURRENT_BRANCH_SHA: SOURCE_SHA,
  };
  return { root, artifact, env };
}

function run(command, env) {
  return spawnSync(process.execPath, [CLI, command], {
    env,
    encoding: "utf8",
  });
}

test("upload preflight rejects public branches sharing the same preview alias", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const collision = run("revalidate-branch", {
    ...f.env,
    EXTRA_BRANCH: "feat/preview_test",
  });
  assert.notEqual(collision.status, 0);
  assert.match(collision.stderr, /ambiguous preview alias/);
  const unrelated = run("revalidate-branch", {
    ...f.env,
    EXTRA_BRANCH: "feat/another-change",
  });
  assert.equal(unrelated.status, 0, unrelated.stderr);
});

test("request CLI rejects malformed references and untrusted workflow context before network access", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));

  const malformed = run("validate-request", {
    ...f.env,
    INPUT_BRANCH: "feat/../../main",
  });
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr, /branch must be a supported named branch/);

  const dnsOverflow = run("validate-request", {
    ...f.env,
    INPUT_BRANCH: `feat/${"a".repeat(64)}`,
  });
  assert.notEqual(dnsOverflow.status, 0);
  assert.match(dnsOverflow.stderr, /exceeds the DNS label limit/);

  const untrusted = run("validate-request", {
    ...f.env,
    GITHUB_REF: "refs/heads/attacker",
  });
  assert.notEqual(untrusted.status, 0);
  assert.match(untrusted.stderr, /trusted main/);

  const wrongRepository = run("validate-request", {
    ...f.env,
    GITHUB_REPOSITORY: "attacker/volleybro",
  });
  assert.notEqual(wrongRepository.status, 0);
  assert.match(wrongRepository.stderr, /must run in andrewck24\/volleybro/);
});

test("request CLI rejects a branch that moved away from the requested source SHA", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const result = run("validate-request", {
    ...f.env,
    CURRENT_BRANCH_SHA: "a".repeat(40),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no longer the current public branch head/);
});

test("artifact CLI accepts the matching receipt and rejects mismatched snapshots", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));

  const valid = run("validate-artifact", f.env);
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /receipt and files are valid/);

  const mismatched = run("validate-artifact", {
    ...f.env,
    INPUT_STORE_SHA: "5".repeat(40),
  });
  assert.notEqual(mismatched.status, 0);
  assert.match(mismatched.stderr, /receipt does not match/);
});

test("artifact CLI rejects symlinks and special files from the real filesystem", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));

  await symlink(
    path.join(f.root, "outside"),
    path.join(f.artifact, "linked-file"),
  );
  const symlinkResult = run("validate-artifact", f.env);
  assert.notEqual(symlinkResult.status, 0);
  assert.match(symlinkResult.stderr, /symbolic link/);
  await rm(path.join(f.artifact, "linked-file"));

  if (process.platform !== "win32") {
    execFileSync("mkfifo", [path.join(f.artifact, "pipe")]);
    const specialResult = run("validate-artifact", f.env);
    assert.notEqual(specialResult.status, 0);
    assert.match(specialResult.stderr, /special file/);
  }
});

test("prepare-upload writes a minimal isolated config and a DNS-safe alias", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const output = path.join(f.root, "github-output");
  const config = path.join(f.root, "wrangler.json");
  const result = run("prepare-upload", {
    ...f.env,
    CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
    WRANGLER_CONFIG_PATH: config,
    GITHUB_OUTPUT: output,
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(await readFile(config, "utf8"));
  assert.deepEqual(Object.keys(parsed).sort(), [
    "account_id",
    "compatibility_date",
    "name",
  ]);
  assert.equal(parsed.name, "volleybro-blueprint");
  assert.equal(parsed.compatibility_date, "2026-07-01");
  const alias = (await readFile(output, "utf8")).trim().replace(/^alias=/, "");
  assert.equal(alias, "feat-preview-test");
  assert.ok(alias.length + 1 + "volleybro-blueprint".length <= 63);
});

test("upload CLI invokes Wrangler with static asset options in the isolated directory", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const observed = path.join(f.root, "wrangler-args.json");
  const cli = path.join(f.root, "fake-wrangler.js");
  await writeFile(
    cli,
    "import { writeFile } from 'node:fs/promises';\n" +
      "await writeFile(process.env.OBSERVED, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), tokenPresent: Boolean(process.env.CLOUDFLARE_API_TOKEN) }));\n",
  );
  const result = run("upload", {
    ...f.env,
    CLOUDFLARE_API_TOKEN: "test-secret",
    WRANGLER_CLI: cli,
    WRANGLER_CONFIG_PATH: path.join(f.root, "wrangler.json"),
    OBSERVED: observed,
  });
  assert.equal(result.status, 0, result.stderr);
  const invocation = JSON.parse(await readFile(observed, "utf8"));
  assert.equal(invocation.tokenPresent, true);
  assert.equal(invocation.cwd, await realpath(f.root));
  assert.deepEqual(invocation.args, [
    "versions",
    "upload",
    "--config",
    path.join(f.root, "wrangler.json"),
    "--assets",
    f.artifact,
    "--name",
    "volleybro-blueprint",
    "--preview-alias",
    "feat-preview-test",
    "--strict",
  ]);
});
