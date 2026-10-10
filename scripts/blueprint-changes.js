#!/usr/bin/env node
/*
 * Sync blueprint/content/changes/ (gitignored) with the orphan
 * `blueprint-changes` branch that holds published Blueprint Change pages.
 *
 * Usage:
 *   node scripts/blueprint-changes.js pull [--force [slug...]]
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

import { changeFacts, isReviewFile, readChangeDir } from "./change-page.js";

const execFileAsync = promisify(execFile);

const BRANCH = "blueprint-changes";
export const REMOTE_REF = "refs/blueprint-changes/remote";
const FETCH_REFSPEC = `+${BRANCH}:${REMOTE_REF}`;
const DEFAULT_REMOTE = "https://github.com/andrewck24/volleybro.git";
const CHANGES_DIR_SEGMENTS = ["blueprint", "content", "changes"];
// Dotfile, not `meta.json` — Fumadocs treats JSON metadata files as navigation
// metadata, so this must stay outside the content collection's JSON glob.
const STORE_FILE = ".store-state.json";
const DEPLOY_WORKFLOW = [".github", "workflows", "blueprint-deploy.yml"];
// See ADR-0082.
const HISTORY_WARN_BYTES = 50_000_000;

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
    // No eol conversion: pages land byte-for-byte as stored, so their hashes match.
    const archive = spawn(
      "git",
      ["-c", "core.autocrlf=false", "-c", "core.eol=lf", "archive", ref, slug],
      { cwd: repoRoot },
    );
    // cwd, not -C: Git for Windows' tar reads "C:\..." as a remote host.
    const tar = spawn("tar", ["-x"], {
      cwd: destDir,
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

// No `--depth`: a shallow fetch writes a graft into whichever repository runs
// it, which marks the whole repository shallow and can make a later push to a
// host refuse the history. The store holds pages, not a large history, so a
// single-branch fetch is cheap enough to take whole.
export async function fetchChanges(remote, repoRoot, storeSha) {
  if (storeSha && !/^[0-9a-f]{40}$/.test(storeSha))
    throw new Error("Blueprint store snapshot must be a full commit SHA");
  await runGit(
    ["fetch", remote, storeSha ? `+${storeSha}:${REMOTE_REF}` : FETCH_REFSPEC],
    { cwd: repoRoot },
  );
}

export async function readStore(changesDir) {
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
export async function hashDir(dir) {
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

// A build that silently drops every Change page is worse than one that stops,
// and a hosted build cannot be asked to pass a flag: any CI-ish environment
// requires the store unless it opts out explicitly.
function isRequired() {
  const explicit = process.env.BLUEPRINT_REQUIRE_CHANGES;
  if (explicit !== undefined) return explicit === "1";
  return Boolean(process.env.CI || process.env.WORKERS_CI);
}

async function warnIfHistoryTooLarge(repoRoot, limit) {
  let bytes;
  try {
    const { stdout } = await runGit(
      ["rev-list", "--objects", "--disk-usage", REMOTE_REF],
      { cwd: repoRoot },
    );
    bytes = Number(stdout.trim());
  } catch {
    // An old git without --disk-usage must not block the pull.
    return;
  }
  if (bytes > limit) {
    const toMb = (value) => (value / 1_000_000).toFixed(1);
    console.warn(
      `blueprint-changes pull: the ${BRANCH} history is ${toMb(bytes)} MB, past the ${toMb(limit)} MB threshold; revisit its retention (ADR-0082)`,
    );
  }
}

// A page differs from what was last pulled or published only through local
// edits, and pages are gitignored, so those edits exist nowhere else.
function isEditedLocally(store, slug, currentHash) {
  return store[slug] !== currentHash;
}

// ADR-0079 exempts a converted page from the gates; its facts.json carries the
// mark. An unreadable facts.json is treated as unmarked.
export async function isConverted(slugDir) {
  try {
    const facts = JSON.parse(
      await readFile(path.join(slugDir, "facts.json"), "utf8"),
    );
    return facts.converted === true;
  } catch {
    return false;
  }
}

// `force` is true to overwrite every page, or the slugs to overwrite.
export async function pull(
  cwd,
  {
    force = false,
    historyWarnBytes = HISTORY_WARN_BYTES,
    storeSha = process.env.BLUEPRINT_CHANGES_STORE_SHA,
  } = {},
) {
  const repoRoot = await getRepoRoot(cwd);
  const changesDir = path.join(repoRoot, ...CHANGES_DIR_SEGMENTS);
  const remote = await resolveRemote(repoRoot);
  // Created before the fetch so a build that could not fetch still finds it.
  await mkdir(changesDir, { recursive: true });

  try {
    await fetchChanges(remote, repoRoot, storeSha);
  } catch {
    if (storeSha)
      throw new Error("Could not fetch the selected Blueprint store snapshot");
    const message = `blueprint-changes pull: could not fetch ${BRANCH} from ${remote}`;
    if (isRequired()) {
      console.error(message);
      process.exitCode = 1;
      return;
    }
    console.warn(message);
    return;
  }

  await warnIfHistoryTooLarge(repoRoot, historyWarnBytes);
  const store = await readStore(changesDir);
  const { stdout } = await runGit(
    ["ls-tree", "-d", "--name-only", REMOTE_REF],
    { cwd: repoRoot },
  );
  const slugs = stdout
    .split("\n")
    .map((line) => line.trim())
    // Dot-directories hold store plumbing such as the deploy workflow.
    .filter((name) => name && !name.startsWith("."));

  if (Array.isArray(force)) {
    const unknown = force.filter((slug) => !slugs.includes(slug));
    if (unknown.length > 0) {
      console.warn(
        `blueprint-changes pull: --force names slugs the store does not hold: ${unknown.join(", ")}`,
      );
    }
  } else if (force) {
    const edited = [];
    for (const slug of slugs) {
      const destDir = path.join(changesDir, slug);
      if (
        existsSync(destDir) &&
        isEditedLocally(store, slug, await hashDir(destDir))
      ) {
        edited.push(slug);
      }
    }
    if (edited.length > 0) {
      console.error(
        `blueprint-changes pull: --force would overwrite unpublished edits in ${edited.join(", ")}; name the slugs to overwrite: --force <slug>...`,
      );
      process.exitCode = 1;
      return;
    }
  }

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

      if (force === true || (Array.isArray(force) && force.includes(slug))) {
        await replaceDir(destDir, scratchDir);
        store[slug] = remoteHash;
        refreshed += 1;
        continue;
      }

      const currentHash = await hashDir(destDir);
      if (!isEditedLocally(store, slug, currentHash)) {
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

// A push runs the workflows of the pushed commit, so the orphan store needs
// its own copy of the deploy workflow.
async function syncDeployWorkflow(tmpDir, repoRoot) {
  const source = path.join(repoRoot, ...DEPLOY_WORKFLOW);
  if (!existsSync(source)) return;
  const workflow = path.join(tmpDir, ...DEPLOY_WORKFLOW);
  await mkdir(path.dirname(workflow), { recursive: true });
  await cp(source, workflow);
}

async function applyChange(tmpDir, slug, localSlugDir, { proposalOnly }) {
  const targetDir = path.join(tmpDir, slug);
  await rm(targetDir, { recursive: true, force: true });
  await cp(localSlugDir, targetDir, { recursive: true });
  if (proposalOnly) {
    for (const name of await readdir(targetDir)) {
      if (isReviewFile(name)) await rm(path.join(targetDir, name));
    }
  }
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

// The fallback start for a Change with no commit yet: its first publish,
// or undefined before that first publish.
async function firstPublishedAt(repoRoot, slug) {
  try {
    const { stdout } = await runGit(
      ["log", "--reverse", "--format=%cI", REMOTE_REF, "--", slug],
      { cwd: repoRoot },
    );
    const [first] = stdout.trim().split("\n");
    return first ? new Date(first).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

async function writeFacts(repoRoot, slugDir, { proposalOnly }) {
  if (!existsSync(path.join(slugDir, "index.mdx"))) return;
  // A converted page's facts come from its earlier format, which git cannot
  // rebuild, so republishing it keeps them.
  if (await isConverted(slugDir)) return;
  const page = await readChangeDir(slugDir);
  if (proposalOnly) page.reviews = [];
  const slug = path.basename(slugDir);
  let facts;
  try {
    facts = await changeFacts(repoRoot, page, {
      slug,
      firstPublishedAt: await firstPublishedAt(repoRoot, slug),
      gate: proposalOnly ? "G1" : undefined,
    });
  } catch (error) {
    throw new Error(
      `${slug} is not valid MDX, so it cannot be published: ${error.message.split("\n")[0]}`,
    );
  }
  await writeFile(
    path.join(slugDir, "facts.json"),
    `${JSON.stringify(facts, null, 2)}\n`,
  );
}

async function recordPublishedHash(repoRoot, slug, localSlugDir) {
  const changesDir = path.join(repoRoot, ...CHANGES_DIR_SEGMENTS);
  const store = await readStore(changesDir);
  store[slug] = await hashDir(localSlugDir);
  await writeStore(changesDir, store);
}

const MAX_PUSH_ATTEMPTS = 2;

// A push is rejected this way only when the remote branch moved since we
// forked our worktree from it — the race `publish` retries once. Any other
// failure (auth, network, a protected branch) is not that race and must
// surface instead of being silently retried.
function isNonFastForwardRejection(error) {
  const stderr = String(error?.stderr ?? "");
  return (
    stderr.includes("non-fast-forward") ||
    stderr.includes("fetch first") ||
    stderr.includes("[rejected]") ||
    // Two pushes landing at the same instant race on the ref's lock file
    // instead of git's usual non-fast-forward check — same race, different
    // wording.
    stderr.includes("cannot lock ref")
  );
}

// proposalOnly publishes the page without its Review files: the G1 baseline
// of a page that already has one (ADR-0095).
export async function publish(
  cwd,
  slug,
  { dryRun = false, proposalOnly = false } = {},
) {
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

  // After the fetch: a commitless Change's start is its first publish, which
  // firstPublishedAt reads from the fetched store.
  if (!dryRun) await writeFacts(repoRoot, localSlugDir, { proposalOnly });

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
      await runGit(["checkout", "--orphan", `${BRANCH}-tmp`], {
        cwd: tmpDir,
      });
      await runGit(["rm", "-rf", "--quiet", "."], { cwd: tmpDir }).catch(
        () => {},
      );
    }

    // At most one retry: a concurrent publish can win the race once, but a
    // second rejection in a row is a real problem, not the race.
    for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt += 1) {
      await syncDeployWorkflow(tmpDir, repoRoot);
      const changed = await applyChange(tmpDir, slug, localSlugDir, {
        proposalOnly,
      });
      // The store holds less than the directory after a proposal-only
      // publish, so recording its hash would let a pull overwrite the Reviews.
      if (!changed) {
        console.log(`blueprint-changes publish: no changes for ${slug}`);
        if (!proposalOnly)
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
        if (!proposalOnly)
          await recordPublishedHash(repoRoot, slug, localSlugDir);
        return;
      } catch (error) {
        if (
          attempt === MAX_PUSH_ATTEMPTS ||
          !isNonFastForwardRejection(error)
        ) {
          throw error;
        }
        // Someone else published first — rebase our slug onto their tip
        // and retry once.
        await fetchChanges(remote, repoRoot);
        await runGit(["reset", "--hard", REMOTE_REF], { cwd: tmpDir });
      }
    }
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
    const force =
      flags.has("--force") && (positional.length > 0 ? positional : true);
    await pull(cwd, { force });
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
