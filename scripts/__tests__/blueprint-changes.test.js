import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  chmod,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
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

// Every mkdtemp call in this file routes through here so each test's scratch
// directory is removed via `t.after`, whether the test passes or throws.
async function mkScratch(t, prefix) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

async function initWork(dir) {
  await mkdir(dir, { recursive: true });
  const workGit = git(dir);
  await workGit(["init", "-q", "-b", "dev"]);
  await workGit(["config", "user.email", "test@example.com"]);
  await workGit(["config", "user.name", "Test"]);
  await writeFile(path.join(dir, "README.md"), "init\n");
  await workGit(["add", "-A"]);
  await workGit(["commit", "-q", "-m", "init"]);
}

// A bare "origin" seeded with a blueprint-changes branch holding two slugs,
// plus a work repo cloned from it whose BLUEPRINT_CHANGES_REMOTE points back
// at the bare path — mirrors how the real orphan branch is fetched.
async function makeRemoteAndWork(t, options = {}) {
  const { seedBranch = true } = options;
  const tmp = await mkScratch(t, "blueprint-changes-");
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

  await initWork(work);

  return { tmp, bare, work };
}

// A second local checkout against the same bare remote, for scenarios where
// two publishers race — `makeRemoteAndWork` only ever sets up one.
async function addWork(tmp, name) {
  const work = path.join(tmp, name);
  await initWork(work);
  return work;
}

// Simulates a second contributor publishing a newer version of `slug` by
// cloning the bare remote, editing the file, and pushing straight to it.
async function pushRemoteUpdate(t, bare, slug, content) {
  const tmp = await mkScratch(t, "blueprint-changes-remote-");
  await execFileAsync("git", [
    "clone",
    "-q",
    "-b",
    "blueprint-changes",
    bare,
    tmp,
  ]);
  const remoteGit = git(tmp);
  await remoteGit(["config", "user.email", "test@example.com"]);
  await remoteGit(["config", "user.name", "Test"]);
  await writeFile(path.join(tmp, slug, "proposal.mdx"), content);
  await remoteGit(["add", "-A"]);
  await remoteGit(["commit", "-q", "-m", "update"]);
  await remoteGit(["push", "origin", "blueprint-changes"]);
}

// Temporarily sets an env var for the duration of `fn`, restoring whatever
// was there before (including "unset") once it settles. `withRemote` below
// and the BLUEPRINT_REQUIRE_CHANGES test both need exactly this.
function withEnvOverride(name, value, fn) {
  const previous = process.env[name];
  process.env[name] = value;
  return fn().finally(() => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  });
}

function withRemote(remote, fn) {
  return withEnvOverride("BLUEPRINT_CHANGES_REMOTE", remote, fn);
}

test("pull adds missing slugs", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  await withRemote(bare, () => pull(work));

  const changesDir = path.join(work, "blueprint", "content", "changes");
  assert.deepEqual(
    (await readdir(changesDir)).filter((name) => !name.startsWith(".")).sort(),
    ["alpha", "beta"],
  );
});

test("pull keeps a never-pulled local slug", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  const alphaDir = path.join(work, "blueprint", "content", "changes", "alpha");
  await mkdir(alphaDir, { recursive: true });
  await writeFile(path.join(alphaDir, "local.txt"), "mine\n");

  await withRemote(bare, () => pull(work));

  assert.deepEqual(await readdir(alphaDir), ["local.txt"]);
});

test("pull refreshes an untouched slug after the remote changes", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  const alphaFile = path.join(
    work,
    "blueprint",
    "content",
    "changes",
    "alpha",
    "proposal.mdx",
  );

  await withRemote(bare, () => pull(work));
  assert.equal(await readFile(alphaFile, "utf8"), "# alpha\n");

  await pushRemoteUpdate(t, bare, "alpha", "# alpha v2\n");
  await withRemote(bare, () => pull(work));

  assert.equal(await readFile(alphaFile, "utf8"), "# alpha v2\n");
});

test("pull keeps a slug that was edited locally after being pulled", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  const alphaFile = path.join(
    work,
    "blueprint",
    "content",
    "changes",
    "alpha",
    "proposal.mdx",
  );

  await withRemote(bare, () => pull(work));
  await writeFile(alphaFile, "# alpha edited locally\n");
  await pushRemoteUpdate(t, bare, "alpha", "# alpha v2\n");

  await withRemote(bare, () => pull(work));

  assert.equal(await readFile(alphaFile, "utf8"), "# alpha edited locally\n");
});

test("pull --force replaces an existing local slug", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  const alphaDir = path.join(work, "blueprint", "content", "changes", "alpha");
  await mkdir(alphaDir, { recursive: true });
  await writeFile(path.join(alphaDir, "local.txt"), "mine\n");

  await withRemote(bare, () => pull(work, { force: true }));

  assert.deepEqual(await readdir(alphaDir), ["proposal.mdx"]);
});

test("pull leaves the repository unshallow", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  await withRemote(bare, () =>
    execFileAsync("node", [SCRIPT, "pull"], { cwd: work }),
  );

  // A shallow fetch grafts the repository that runs it, and a grafted
  // repository can have a later push refused by its host.
  await assert.rejects(access(path.join(work, ".git", "shallow")));
});

test("missing remote branch: pull warns and exits 0", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t, { seedBranch: false });
  // This suite itself runs in CI, where a missing store is fatal; the
  // developer-shell default is what this test is about.
  const result = await withEnvOverride("CI", "", () =>
    withEnvOverride("WORKERS_CI", "", () =>
      withRemote(bare, () =>
        execFileAsync("node", [SCRIPT, "pull"], { cwd: work }),
      ),
    ),
  );
  assert.match(result.stderr, /could not fetch/);
});

test("missing remote branch: pull exits 1 in CI without any flag", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t, { seedBranch: false });
  const error = await withEnvOverride("CI", "1", () =>
    withRemote(bare, () =>
      execFileAsync("node", [SCRIPT, "pull"], { cwd: work }),
    ).catch((e) => e),
  );
  assert.equal(error.code, 1);
});

test("missing remote branch: BLUEPRINT_REQUIRE_CHANGES=0 opts CI out", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t, { seedBranch: false });
  const result = await withEnvOverride("CI", "1", () =>
    withEnvOverride("BLUEPRINT_REQUIRE_CHANGES", "0", () =>
      withRemote(bare, () =>
        execFileAsync("node", [SCRIPT, "pull"], { cwd: work }),
      ),
    ),
  );
  assert.match(result.stderr, /could not fetch/);
});

test("missing remote branch: pull exits 1 under BLUEPRINT_REQUIRE_CHANGES", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t, { seedBranch: false });
  const error = await withEnvOverride("BLUEPRINT_REQUIRE_CHANGES", "1", () =>
    withRemote(bare, () =>
      execFileAsync("node", [SCRIPT, "pull"], { cwd: work }),
    ).catch((e) => e),
  );
  assert.equal(error.code, 1);
});

test("publish pushes a commit containing the local slug", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
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

test("publish records the hash so a later pull of the same content is a no-op", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  const gammaDir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(gammaDir, { recursive: true });
  await writeFile(path.join(gammaDir, "proposal.mdx"), "# gamma\n");

  await withRemote(bare, () => publish(work, "gamma"));

  const storePath = path.join(
    work,
    "blueprint",
    "content",
    "changes",
    ".store-state.json",
  );
  const store = JSON.parse(await readFile(storePath, "utf8"));
  assert.ok(store.gamma);

  await withRemote(bare, () => pull(work));

  assert.equal(
    await readFile(path.join(gammaDir, "proposal.mdx"), "utf8"),
    "# gamma\n",
  );
  const storeAfter = JSON.parse(await readFile(storePath, "utf8"));
  assert.equal(storeAfter.gamma, store.gamma);
});

test("publish with no changes: records the hash and commits nothing", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  const gammaDir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(gammaDir, { recursive: true });
  await writeFile(path.join(gammaDir, "proposal.mdx"), "# gamma\n");

  await withRemote(bare, () => publish(work, "gamma"));
  const tipAfterFirst = await execFileAsync(
    "git",
    ["rev-parse", "blueprint-changes"],
    { cwd: bare },
  );

  // Same content, published again: applyChange finds nothing staged and
  // must not create a second commit.
  await withRemote(bare, () => publish(work, "gamma"));
  const tipAfterSecond = await execFileAsync(
    "git",
    ["rev-parse", "blueprint-changes"],
    { cwd: bare },
  );

  assert.equal(tipAfterFirst.stdout, tipAfterSecond.stdout);

  const storePath = path.join(
    work,
    "blueprint",
    "content",
    "changes",
    ".store-state.json",
  );
  const store = JSON.parse(await readFile(storePath, "utf8"));
  assert.ok(store.gamma);
});

test("publish --dry-run does not change the remote", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
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

test("publish to a remote without the branch creates it", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t, { seedBranch: false });
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

test("concurrent publishes of different slugs both land on the store branch", async (t) => {
  const { tmp, bare, work } = await makeRemoteAndWork(t);
  const otherWork = await addWork(tmp, "work-other");

  for (const [dir, content] of [
    [work, "# gamma from work\n"],
    [otherWork, "# gamma from other\n"],
  ]) {
    const gammaDir = path.join(dir, "blueprint", "content", "changes", "gamma");
    await mkdir(gammaDir, { recursive: true });
    await writeFile(path.join(gammaDir, "proposal.mdx"), content);
  }

  // Both publishers fetch the same starting tip and race to push; git
  // accepts one push atomically and rejects the other as non-fast-forward,
  // which `publish` must recover from by rebasing onto the new tip and
  // retrying once.
  await withRemote(bare, () =>
    Promise.all([publish(work, "gamma"), publish(otherWork, "gamma")]),
  );

  const { stdout } = await execFileAsync(
    "git",
    ["log", "--oneline", "blueprint-changes", "--", "gamma"],
    { cwd: bare },
  );
  assert.equal(stdout.trim().split("\n").length, 2);
});

test("publish rethrows a push failure that is not a race (pre-receive hook rejects)", async (t) => {
  const { bare, work } = await makeRemoteAndWork(t);
  const hook = path.join(bare, "hooks", "pre-receive");
  await writeFile(hook, "#!/bin/sh\necho 'blocked by policy' >&2\nexit 1\n");
  await chmod(hook, 0o755);

  const gammaDir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(gammaDir, { recursive: true });
  await writeFile(path.join(gammaDir, "proposal.mdx"), "# gamma\n");

  await assert.rejects(
    withRemote(bare, () => publish(work, "gamma")),
    /blocked by policy/,
  );
});
