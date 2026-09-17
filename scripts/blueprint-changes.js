#!/usr/bin/env node
/*
 * Sync blueprint/content/changes/ (gitignored) with the orphan
 * `blueprint-changes` branch that holds published Blueprint Change pages.
 *
 * Usage:
 *   node scripts/blueprint-changes.js pull [--force]
 *   node scripts/blueprint-changes.js publish <slug> [--dry-run]
 */
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BRANCH = "blueprint-changes";
const REMOTE_REF = "refs/blueprint-changes/remote";
const FETCH_REFSPEC = `+${BRANCH}:${REMOTE_REF}`;
const DEFAULT_REMOTE = "https://github.com/andrewck24/volleybro.git";
const CHANGES_DIR_SEGMENTS = ["blueprint", "content", "changes"];
// Dotfile, not `meta.json` — fumadocs-mdx's meta collection in
// source.config.ts only globs `**/meta.json`, so this never becomes a page.
const STORE_FILE = ".store-state.json";

function runGit(args, options) {
  return execFileAsync("git", args, options);
}

async function getRepoRoot(cwd) {
  const { stdout } = await runGit(["rev-parse", "--show-toplevel"], { cwd });
  return stdout.trim();
}

export async function resolveRemote(cwd) {
  if (process.env.BLUEPRINT_CHANGES_REMOTE) {
    return process.env.BLUEPRINT_CHANGES_REMOTE;
  }
  try {
    const { stdout } = await runGit(["config", "--get", "remote.origin.url"], {
      cwd,
    });
    const url = stdout.trim();
    if (url) return url;
  } catch {
    // No origin configured — fall through to the public default.
  }
  return DEFAULT_REMOTE;
}

function archiveExtract(ref, slug, repoRoot, destDir) {
  return new Promise((resolve, reject) => {
    const archive = spawn("git", ["archive", ref, slug], { cwd: repoRoot });
    const tar = spawn("tar", ["-x", "-C", destDir], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    archive.stdout.pipe(tar.stdin);

    let archiveError = "";
    archive.stderr.on("data", (chunk) => {
      archiveError += chunk;
    });

    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    archive.on("error", finish);
    tar.on("error", finish);
    archive.on("close", (code) => {
      if (code !== 0) finish(new Error(`git archive failed: ${archiveError}`));
    });
    tar.on("close", (code) => {
      finish(code === 0 ? undefined : new Error(`tar exited ${code}`));
    });
  });
}

async function fetchChanges(remote, repoRoot) {
  await runGit(["fetch", remote, FETCH_REFSPEC, "--depth=1"], {
    cwd: repoRoot,
  });
}

async function readStore(changesDir) {
  try {
    return JSON.parse(
      await readFile(path.join(changesDir, STORE_FILE), "utf8"),
    );
  } catch {
    return {};
  }
}

async function writeStore(changesDir, store) {
  await writeFile(
    path.join(changesDir, STORE_FILE),
    JSON.stringify(store, null, 2) + "\n",
  );
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files.sort();
}

// A content hash, not a git hash — it must match a plain extracted directory
// with no `.git`, so it can be computed for both a pulled slug and a locally
// edited one.
async function hashDir(dir) {
  const hash = createHash("sha256");
  for (const relativePath of await listFiles(dir)) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(path.join(dir, relativePath)));
  }
  return hash.digest("hex");
}

async function replaceDir(destDir, sourceDir) {
  await rm(destDir, { recursive: true, force: true });
  await cp(sourceDir, destDir, { recursive: true });
}

export async function pull(cwd, { force = false } = {}) {
  const repoRoot = await getRepoRoot(cwd);
  const changesDir = path.join(repoRoot, ...CHANGES_DIR_SEGMENTS);
  const remote = await resolveRemote(repoRoot);

  try {
    await fetchChanges(remote, repoRoot);
  } catch {
    const message = `blueprint-changes pull: could not fetch ${BRANCH} from ${remote}`;
    if (process.env.BLUEPRINT_REQUIRE_CHANGES === "1") {
      console.error(message);
      process.exitCode = 1;
      return;
    }
    console.warn(message);
    return;
  }

  await mkdir(changesDir, { recursive: true });
  const store = await readStore(changesDir);
  const { stdout } = await runGit(
    ["ls-tree", "-d", "--name-only", REMOTE_REF],
    { cwd: repoRoot },
  );
  const slugs = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const scratchParent = await mkdtemp(
    path.join(os.tmpdir(), "blueprint-changes-pull-"),
  );

  let added = 0;
  let refreshed = 0;
  let upToDate = 0;
  const keptLocal = [];

  try {
    for (const slug of slugs) {
      const destDir = path.join(changesDir, slug);
      const scratchDir = path.join(scratchParent, slug);
      await archiveExtract(REMOTE_REF, slug, repoRoot, scratchParent);
      const remoteHash = await hashDir(scratchDir);

      if (!existsSync(destDir)) {
        await cp(scratchDir, destDir, { recursive: true });
        store[slug] = remoteHash;
        added += 1;
        continue;
      }

      if (force) {
        await replaceDir(destDir, scratchDir);
        store[slug] = remoteHash;
        refreshed += 1;
        continue;
      }

      const currentHash = await hashDir(destDir);
      const recordedHash = store[slug];
      if (recordedHash && recordedHash === currentHash) {
        if (remoteHash !== currentHash) {
          await replaceDir(destDir, scratchDir);
          store[slug] = remoteHash;
          refreshed += 1;
        } else {
          upToDate += 1;
        }
      } else {
        keptLocal.push(slug);
      }
    }
  } finally {
    await rm(scratchParent, { recursive: true, force: true });
  }

  await writeStore(changesDir, store);
  console.log(
    `blueprint-changes pull: ${added} added, ${refreshed} refreshed, ${upToDate} up to date, ${keptLocal.length} kept local` +
      (keptLocal.length > 0 ? ` (${keptLocal.join(", ")})` : ""),
  );
}

async function applyChange(tmpDir, slug, localSlugDir) {
  const targetDir = path.join(tmpDir, slug);
  await rm(targetDir, { recursive: true, force: true });
  await cp(localSlugDir, targetDir, { recursive: true });
  await runGit(["add", "-A"], { cwd: tmpDir });
  const { stdout } = await runGit(["status", "--porcelain"], {
    cwd: tmpDir,
  });
  if (stdout.trim() === "") return false;
  await runGit(["commit", "-q", "-m", `docs(changes): publish ${slug}`], {
    cwd: tmpDir,
  });
  return true;
}

async function recordPublishedHash(repoRoot, slug, localSlugDir) {
  const changesDir = path.join(repoRoot, ...CHANGES_DIR_SEGMENTS);
  const store = await readStore(changesDir);
  store[slug] = await hashDir(localSlugDir);
  await writeStore(changesDir, store);
}

export async function publish(cwd, slug, { dryRun = false } = {}) {
  const repoRoot = await getRepoRoot(cwd);
  const localSlugDir = path.join(repoRoot, ...CHANGES_DIR_SEGMENTS, slug);
  await access(localSlugDir);

  const remote = await resolveRemote(repoRoot);

  let branchExists = true;
  try {
    await fetchChanges(remote, repoRoot);
  } catch {
    branchExists = false;
  }

  const tmpParent = await mkdtemp(path.join(os.tmpdir(), "blueprint-changes-"));
  const tmpDir = path.join(tmpParent, "worktree");

  try {
    if (branchExists) {
      await runGit(["worktree", "add", "--detach", tmpDir, REMOTE_REF], {
        cwd: repoRoot,
      });
    } else {
      await runGit(["worktree", "add", "--detach", tmpDir], {
        cwd: repoRoot,
      });
      await runGit(["checkout", "--orphan", "blueprint-changes-tmp"], {
        cwd: tmpDir,
      });
      await runGit(["rm", "-rf", "--quiet", "."], { cwd: tmpDir }).catch(
        () => {},
      );
    }

    const changed = await applyChange(tmpDir, slug, localSlugDir);
    if (!changed) {
      console.log(`blueprint-changes publish: no changes for ${slug}`);
      await recordPublishedHash(repoRoot, slug, localSlugDir);
      return;
    }

    if (dryRun) {
      const { stdout } = await runGit(["log", "-1", "--stat"], {
        cwd: tmpDir,
      });
      console.log(stdout);
      return;
    }

    try {
      await runGit(["push", remote, `HEAD:refs/heads/${BRANCH}`], {
        cwd: tmpDir,
      });
    } catch {
      // Someone else published first — rebase our slug onto their tip once.
      await fetchChanges(remote, repoRoot);
      await runGit(["reset", "--hard", REMOTE_REF], { cwd: tmpDir });
      const retried = await applyChange(tmpDir, slug, localSlugDir);
      if (!retried) {
        console.log(
          `blueprint-changes publish: no changes for ${slug} after retry`,
        );
        await recordPublishedHash(repoRoot, slug, localSlugDir);
        return;
      }
      await runGit(["push", remote, `HEAD:refs/heads/${BRANCH}`], {
        cwd: tmpDir,
      });
    }
    await recordPublishedHash(repoRoot, slug, localSlugDir);
  } finally {
    await runGit(["worktree", "remove", "--force", tmpDir], {
      cwd: repoRoot,
    }).catch(() => {});
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
  const positional = rest.filter((arg) => !arg.startsWith("--"));
  return { command, positional, flags };
}

async function main() {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  if (command === "pull") {
    await pull(cwd, { force: flags.has("--force") });
    return;
  }

  if (command === "publish") {
    const [slug] = positional;
    if (!slug) {
      console.error("Usage: blueprint-changes.js publish <slug> [--dry-run]");
      process.exitCode = 1;
      return;
    }
    await publish(cwd, slug, { dryRun: flags.has("--dry-run") });
    return;
  }

  console.error("Usage: blueprint-changes.js <pull|publish> ...");
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
