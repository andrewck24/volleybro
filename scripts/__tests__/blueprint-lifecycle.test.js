import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { checkBlueprintOutput } from "../blueprint-check-output.js";
import { prepareBlueprint } from "../blueprint-prepare.js";
import { changeInputHash, prepareLifecycle } from "../blueprint-lifecycle.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  return (await execFileAsync("git", args, { cwd })).stdout.trim();
}

async function commit(cwd, files, message) {
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(cwd, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  await git(cwd, "add", ".");
  await git(cwd, "commit", "--quiet", "-m", message);
  return git(cwd, "rev-parse", "HEAD");
}

async function fixture(t) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "blueprint-lifecycle-test-"),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = path.join(root, "remote.git");
  const repo = path.join(root, "repo");
  await git(root, "init", "--bare", "--quiet", remote);
  await mkdir(repo);
  await git(repo, "init", "--quiet", "-b", "main");
  await git(repo, "remote", "add", "origin", remote);
  await git(repo, "config", "user.name", "Fixture");
  await git(repo, "config", "user.email", "fixture@example.test");
  await commit(
    repo,
    {
      "README.md": "base\n",
      ".gitignore":
        "blueprint/content/changes/\nblueprint/out/\nblueprint/public/blueprint-build.json\nblueprint/.change-lifecycle*\n",
    },
    "base",
  );
  await git(repo, "push", "--quiet", "-u", "origin", "main");
  await git(repo, "push", "--quiet", "origin", "main:blueprint-changes");
  await git(repo, "remote", "set-head", "origin", "main");
  await git(remote, "symbolic-ref", "HEAD", "refs/heads/main");
  await git(repo, "fetch", "--quiet", "origin");
  await git(
    repo,
    "fetch",
    "--quiet",
    "origin",
    "+blueprint-changes:refs/blueprint-changes/remote",
  );
  await git(
    repo,
    "symbolic-ref",
    "refs/remotes/origin/HEAD",
    "refs/remotes/origin/main",
  );
  return { root, repo, remote };
}

async function published(repo, slug, { shards, converted = false } = {}) {
  const directory = path.join(repo, "blueprint", "content", "changes", slug);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "index.mdx"),
    `---\ntitle: ${slug}\n${shards ? `shards: ${shards}\n` : ""}---\n`,
  );
  await writeFile(
    path.join(directory, "facts.json"),
    JSON.stringify(
      {
        gate: "G2",
        startedAt: "2026-09-30T00:00:00.000Z",
        archivedAt: null,
        commits: 7,
        filesChanged: 3,
        ...(converted ? { converted: true } : {}),
        ...(shards ? { shards: { count: shards, merged: 0, items: [] } } : {}),
      },
      null,
      2,
    ),
  );
  const statePath = path.join(
    repo,
    "blueprint",
    "content",
    "changes",
    ".store-state.json",
  );
  let state = {};
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch {}
  state[slug] = await changeInputHash(directory);
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

test("derives landing lifecycle from a complete isolated integration snapshot", async (t) => {
  const { root, repo, remote } = await fixture(t);
  const topic = path.join(root, "topic");
  await git(root, "clone", "--quiet", repo, topic);
  await git(topic, "checkout", "--quiet", "-b", "feat/alpha");
  await git(topic, "config", "user.name", "Fixture");
  await git(topic, "config", "user.email", "fixture@example.test");
  await commit(
    topic,
    { "src/alpha.ts": "export const alpha = true;\n" },
    "alpha",
  );
  await git(repo, "fetch", "--quiet", topic, "feat/alpha");
  await git(
    repo,
    "merge",
    "--quiet",
    "--no-ff",
    "FETCH_HEAD",
    "-m",
    "Merge branch 'feat/alpha'",
  );
  const landing = await git(repo, "show", "-s", "--format=%cI", "HEAD");
  await git(repo, "push", "--quiet", "origin", "main");
  await git(repo, "push", "--quiet", "origin", "main:trunk");
  await git(remote, "symbolic-ref", "HEAD", "refs/heads/trunk");

  await published(repo, "alpha");
  await published(repo, "draft");
  await published(repo, "converted", { converted: true });
  await writeFile(
    path.join(repo, "blueprint/content/changes/draft/proposal.mdx"),
    "local unpublished edit\n",
  );
  const receipt = await prepareBlueprint(repo);
  const overlay = JSON.parse(
    await readFile(
      path.join(repo, "blueprint", ".change-lifecycle.json"),
      "utf8",
    ),
  );
  const saved = JSON.parse(
    await readFile(
      path.join(repo, "blueprint/content/changes/alpha/facts.json"),
      "utf8",
    ),
  );

  assert.match(receipt.sourceSha, /^[0-9a-f]{40}$/);
  assert.equal(
    receipt.sourceSha,
    await git(repo, "rev-parse", "HEAD^{commit}"),
  );
  assert.match(receipt.integrationSha, /^[0-9a-f]{40}$/);
  assert.equal(overlay.integrationSha, receipt.integrationSha);
  assert.equal(
    receipt.storeSha,
    await git(repo, "rev-parse", "refs/blueprint-changes/remote^{commit}"),
  );
  assert.equal(
    receipt.changeInputHashes.alpha,
    await changeInputHash(path.join(repo, "blueprint/content/changes/alpha")),
  );
  assert.equal(
    overlay.changes.alpha.facts.archivedAt,
    new Date(landing).toISOString(),
  );
  assert.equal(saved.archivedAt, null);
  assert.equal(saved.startedAt, "2026-09-30T00:00:00.000Z");
  assert.equal(saved.commits, 7);
  assert.equal(overlay.changes.draft, undefined);
  assert.ok(receipt.changeInputHashes.draft);
  assert.equal(overlay.changes.converted, undefined);
  assert.ok(receipt.changeInputHashes.converted);

  const publicReceipt = path.join(
    repo,
    "blueprint",
    "public",
    "blueprint-build.json",
  );
  const outputReceipt = path.join(
    repo,
    "blueprint",
    "out",
    "blueprint-build.json",
  );
  await mkdir(path.dirname(outputReceipt), { recursive: true });
  await copyFile(publicReceipt, outputReceipt);
  await checkBlueprintOutput(repo);
  await writeFile(path.join(repo, "README.md"), "changed after export\n");
  await assert.rejects(checkBlueprintOutput(repo), /Blueprint output is stale/);
  await writeFile(path.join(repo, "README.md"), "base\n");
  await writeFile(
    path.join(repo, "blueprint/content/changes/alpha/proposal.mdx"),
    "new page inputs\n",
  );
  await assert.rejects(checkBlueprintOutput(repo), /Blueprint output is stale/);
  await rm(path.join(repo, "blueprint/content/changes/alpha/proposal.mdx"));
  await writeFile(outputReceipt, `${await readFile(outputReceipt, "utf8")}\n`);
  await assert.rejects(checkBlueprintOutput(repo), /Blueprint output is stale/);

  const overlayPath = path.join(repo, "blueprint", ".change-lifecycle.json");
  await git(remote, "symbolic-ref", "HEAD", "refs/heads/missing");
  await assert.rejects(prepareLifecycle(repo));
  await assert.rejects(readFile(overlayPath));
  await assert.rejects(readFile(`${overlayPath}.${process.pid}.tmp`));
});

test("keeps a sharded parent open until every declared shard lands", async (t) => {
  const { repo } = await fixture(t);
  await git(repo, "config", "user.name", "Fixture");
  await git(repo, "config", "user.email", "fixture@example.test");
  await git(repo, "checkout", "-b", "feat/alpha-s1");
  await commit(
    repo,
    { "src/one.ts": "export const one = 1;\n" },
    "one\n\nBlueprint-Change: alpha\nShard: 1",
  );
  await git(repo, "checkout", "main");
  await git(
    repo,
    "merge",
    "--quiet",
    "--no-ff",
    "feat/alpha-s1",
    "-m",
    "Merge branch 'feat/alpha-s1'",
  );
  await git(repo, "push", "--quiet", "origin", "main");
  await published(repo, "alpha", { shards: 2 });

  const output = await prepareLifecycle(repo);
  const overlay = JSON.parse(await readFile(output.overlayPath, "utf8"));
  assert.equal(overlay.changes.alpha.facts.archivedAt, null);
  assert.equal(overlay.changes.alpha.facts.shards.merged, 1);
  assert.ok(overlay.changes.alpha.facts.shards.items[0].archivedAt);
  assert.equal(overlay.changes.alpha.facts.shards.items[1].archivedAt, null);
});
