import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

// Simulates a second contributor publishing a newer version of `slug` by
// cloning the bare remote, editing the file, and pushing straight to it.
async function pushRemoteUpdate(bare, slug, content) {
  const tmp = await mkdtemp(
    path.join(os.tmpdir(), "blueprint-changes-remote-"),
  );
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
  assert.deepEqual(
    (await readdir(changesDir)).filter((name) => !name.startsWith(".")).sort(),
    ["alpha", "beta"],
  );
});

test("pull keeps a never-pulled local slug", async () => {
  const { bare, work } = await makeRemoteAndWork();
  const alphaDir = path.join(work, "blueprint", "content", "changes", "alpha");
  await mkdir(alphaDir, { recursive: true });
  await writeFile(path.join(alphaDir, "local.txt"), "mine\n");

  await withRemote(bare, () => pull(work));

  assert.deepEqual(await readdir(alphaDir), ["local.txt"]);
});

test("pull refreshes an untouched slug after the remote changes", async () => {
  const { bare, work } = await makeRemoteAndWork();
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

  await pushRemoteUpdate(bare, "alpha", "# alpha v2\n");
  await withRemote(bare, () => pull(work));

  assert.equal(await readFile(alphaFile, "utf8"), "# alpha v2\n");
});

test("pull keeps a slug that was edited locally after being pulled", async () => {
  const { bare, work } = await makeRemoteAndWork();
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
  await pushRemoteUpdate(bare, "alpha", "# alpha v2\n");

  await withRemote(bare, () => pull(work));

  assert.equal(await readFile(alphaFile, "utf8"), "# alpha edited locally\n");
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

test("publish records the hash so a later pull of the same content is a no-op", async () => {
  const { bare, work } = await makeRemoteAndWork();
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
