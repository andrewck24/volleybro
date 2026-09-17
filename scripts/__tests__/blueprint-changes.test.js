import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { pull, publish } from "../blueprint-changes.js";

const execFileAsync = promisify(execFile);
const SCRIPT = fileURLToPath(
  new URL("../blueprint-changes.js", import.meta.url),
);

function git(cwd) {
  return (args) => execFileAsync("git", args, { cwd });
}

// A bare "origin" seeded with a blueprint-changes branch holding two slugs,
// plus a work repo cloned from it whose BLUEPRINT_CHANGES_REMOTE points back
// at the bare path — mirrors how the real orphan branch is fetched.
async function makeRemoteAndWork(options = {}) {
  const { seedBranch = true } = options;
  const tmp = await mkdtemp(path.join(os.tmpdir(), "blueprint-changes-"));
  const bare = path.join(tmp, "origin.git");
  const work = path.join(tmp, "work");

  await execFileAsync("git", ["init", "-q", "--bare", "-b", "main", bare]);

  if (seedBranch) {
    const seed = path.join(tmp, "seed");
    await mkdir(seed, { recursive: true });
    const seedGit = git(seed);
    await seedGit(["init", "-q", "-b", "blueprint-changes"]);
    await seedGit(["config", "user.email", "test@example.com"]);
    await seedGit(["config", "user.name", "Test"]);
    for (const slug of ["alpha", "beta"]) {
      await mkdir(path.join(seed, slug), { recursive: true });
      await writeFile(path.join(seed, slug, "proposal.mdx"), `# ${slug}\n`);
    }
    await seedGit(["add", "-A"]);
    await seedGit(["commit", "-q", "-m", "seed"]);
    await seedGit(["push", bare, "blueprint-changes"]);
  }

  await mkdir(work, { recursive: true });
  const workGit = git(work);
  await workGit(["init", "-q", "-b", "dev"]);
  await workGit(["config", "user.email", "test@example.com"]);
  await workGit(["config", "user.name", "Test"]);
  await writeFile(path.join(work, "README.md"), "init\n");
  await workGit(["add", "-A"]);
  await workGit(["commit", "-q", "-m", "init"]);

  return { bare, work };
}

function withRemote(remote, fn) {
  const previous = process.env.BLUEPRINT_CHANGES_REMOTE;
  process.env.BLUEPRINT_CHANGES_REMOTE = remote;
  return fn().finally(() => {
    if (previous === undefined) delete process.env.BLUEPRINT_CHANGES_REMOTE;
    else process.env.BLUEPRINT_CHANGES_REMOTE = previous;
  });
}

test("pull adds missing slugs", async () => {
  const { bare, work } = await makeRemoteAndWork();
  await withRemote(bare, () => pull(work));

  const changesDir = path.join(work, "blueprint", "content", "changes");
  assert.deepEqual((await readdir(changesDir)).sort(), ["alpha", "beta"]);
});

test("pull does not clobber an existing local slug", async () => {
  const { bare, work } = await makeRemoteAndWork();
  const alphaDir = path.join(work, "blueprint", "content", "changes", "alpha");
  await mkdir(alphaDir, { recursive: true });
  await writeFile(path.join(alphaDir, "local.txt"), "mine\n");

  await withRemote(bare, () => pull(work));

  assert.deepEqual(await readdir(alphaDir), ["local.txt"]);
});

test("pull --force replaces an existing local slug", async () => {
  const { bare, work } = await makeRemoteAndWork();
  const alphaDir = path.join(work, "blueprint", "content", "changes", "alpha");
  await mkdir(alphaDir, { recursive: true });
  await writeFile(path.join(alphaDir, "local.txt"), "mine\n");

  await withRemote(bare, () => pull(work, { force: true }));

  assert.deepEqual(await readdir(alphaDir), ["proposal.mdx"]);
});

test("missing remote branch: pull warns and exits 0", async () => {
  const { bare, work } = await makeRemoteAndWork({ seedBranch: false });
  const result = await withRemote(bare, () =>
    execFileAsync("node", [SCRIPT, "pull"], { cwd: work }),
  );
  assert.match(result.stderr, /could not fetch/);
});

test("missing remote branch: pull exits 1 under BLUEPRINT_REQUIRE_CHANGES", async () => {
  const { bare, work } = await makeRemoteAndWork({ seedBranch: false });
  const previousRequire = process.env.BLUEPRINT_REQUIRE_CHANGES;
  process.env.BLUEPRINT_REQUIRE_CHANGES = "1";
  try {
    const error = await withRemote(bare, () =>
      execFileAsync("node", [SCRIPT, "pull"], { cwd: work }).catch((e) => e),
    );
    assert.equal(error.code, 1);
  } finally {
    if (previousRequire === undefined) {
      delete process.env.BLUEPRINT_REQUIRE_CHANGES;
    } else {
      process.env.BLUEPRINT_REQUIRE_CHANGES = previousRequire;
    }
  }
});

test("publish pushes a commit containing the local slug", async () => {
  const { bare, work } = await makeRemoteAndWork();
  const gammaDir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(gammaDir, { recursive: true });
  await writeFile(path.join(gammaDir, "proposal.mdx"), "# gamma\n");

  await withRemote(bare, () => publish(work, "gamma"));

  const { stdout } = await execFileAsync(
    "git",
    ["archive", "blueprint-changes", "gamma"],
    { cwd: bare },
  );
  assert.match(stdout, /proposal\.mdx/);
});

test("publish --dry-run does not change the remote", async () => {
  const { bare, work } = await makeRemoteAndWork();
  const gammaDir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(gammaDir, { recursive: true });
  await writeFile(path.join(gammaDir, "proposal.mdx"), "# gamma\n");

  const before = await execFileAsync(
    "git",
    ["rev-parse", "blueprint-changes"],
    { cwd: bare },
  );

  await withRemote(bare, () => publish(work, "gamma", { dryRun: true }));

  const after = await execFileAsync("git", ["rev-parse", "blueprint-changes"], {
    cwd: bare,
  });
  assert.equal(before.stdout, after.stdout);
});

test("publish to a remote without the branch creates it", async () => {
  const { bare, work } = await makeRemoteAndWork({ seedBranch: false });
  const gammaDir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(gammaDir, { recursive: true });
  await writeFile(path.join(gammaDir, "proposal.mdx"), "# gamma\n");

  await withRemote(bare, () => publish(work, "gamma"));

  const { stdout } = await execFileAsync(
    "git",
    ["archive", "blueprint-changes", "gamma"],
    { cwd: bare },
  );
  assert.match(stdout, /proposal\.mdx/);
});
