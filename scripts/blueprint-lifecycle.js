import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { createLandingHistory } from "./change-page.js";
import { hashDir } from "./blueprint-changes.js";

const execFileAsync = promisify(execFile);

async function git(root, args) {
  return (await execFileAsync("git", args, { cwd: root })).stdout.trim();
}

async function optional(read) {
  try {
    return await read();
  } catch {
    return null;
  }
}

export const changeInputHash = hashDir;

async function snapshotIntegration(root, temporary, selectedSha) {
  if (selectedSha && !/^[0-9a-f]{40}$/.test(selectedSha))
    throw new Error("Blueprint integration snapshot must be a full commit SHA");
  const remote = await git(root, ["remote", "get-url", "origin"]);
  const remoteHead = await git(root, [
    "ls-remote",
    "--symref",
    "origin",
    "HEAD",
  ]);
  const branch = remoteHead.match(
    /^ref:\s+refs\/heads\/([^\t\n]+)\tHEAD$/m,
  )?.[1];
  if (!branch)
    throw new Error("Cannot verify origin default branch from remote HEAD");
  const ref = `refs/heads/${branch}`;
  await git(temporary, [
    "fetch",
    "--no-tags",
    "--filter=blob:none",
    remote,
    `+${selectedSha ?? ref}:refs/heads/integration`,
  ]);
  const integrationSha = await git(temporary, [
    "rev-parse",
    "refs/heads/integration^{commit}",
  ]);
  const shallow = await git(temporary, [
    "rev-parse",
    "--is-shallow-repository",
  ]);
  if (shallow !== "false") throw new Error("Integration snapshot is shallow");
  await git(temporary, [
    "rev-list",
    "--parents",
    "--missing=error",
    integrationSha,
  ]);
  return { integrationSha, branch };
}

export async function prepareLifecycle(
  root,
  { integrationSha: selectedSha = process.env.BLUEPRINT_INTEGRATION_SHA } = {},
) {
  const changesRoot = path.join(root, "blueprint", "content", "changes");
  const overlayPath = path.join(root, "blueprint", ".change-lifecycle.json");
  const temporaryPath = `${overlayPath}.${process.pid}.tmp`;
  await rm(overlayPath, { force: true });
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "blueprint-integration-"),
  );
  let result;
  try {
    await git(temporary, ["init", "--quiet"]);
    const { integrationSha, branch } = await snapshotIntegration(
      root,
      temporary,
      selectedSha,
    );
    const storeSha = await git(root, [
      "rev-parse",
      "refs/blueprint-changes/remote^{commit}",
    ]);
    const landingFor = createLandingHistory(
      temporary,
      "refs/heads/integration",
    );
    const changes = {};
    const changeInputHashes = {};
    const storeState = await optional(async () =>
      JSON.parse(
        await readFile(path.join(changesRoot, ".store-state.json"), "utf8"),
      ),
    );
    for (const slug of await readdir(changesRoot)) {
      const directory = path.join(changesRoot, slug);
      if (!(await stat(directory)).isDirectory()) continue;
      const hash = await changeInputHash(directory);
      changeInputHashes[slug] = hash;
      const facts = await optional(async () =>
        JSON.parse(await readFile(path.join(directory, "facts.json"), "utf8")),
      );
      if (!facts || facts.converted || storeState?.[slug] !== hash) continue;
      const index = await optional(() =>
        readFile(path.join(directory, "index.mdx"), "utf8"),
      );
      if (!index) continue;
      const declared = Number(index.match(/^shards:\s*(\d+)\s*$/m)?.[1]);
      let lifecycle;
      if (Number.isInteger(declared) && declared > 0) {
        const items = [];
        for (let shard = 1; shard <= declared; shard += 1) {
          const landing = await landingFor(slug, shard);
          items.push({
            shard,
            archivedAt: landing
              ? new Date(landing.archivedAt).toISOString()
              : null,
          });
        }
        const merged = items.filter((item) => item.archivedAt);
        lifecycle = {
          archivedAt:
            merged.length === declared
              ? merged
                  .map((item) => item.archivedAt)
                  .sort()
                  .at(-1)
              : null,
          shards: {
            ...(facts.shards ?? {}),
            count: declared,
            merged: merged.length,
            items: items.map((item) => ({
              ...(facts.shards?.items ?? []).find(
                (saved) => saved.shard === item.shard,
              ),
              ...item,
            })),
          },
        };
      } else {
        const landing = await landingFor(slug);
        lifecycle = {
          archivedAt: landing
            ? new Date(landing.archivedAt).toISOString()
            : null,
        };
      }
      changes[slug] = { inputHash: hash, facts: lifecycle };
    }
    await mkdir(path.dirname(overlayPath), { recursive: true });
    await writeFile(
      temporaryPath,
      `${JSON.stringify({ integrationSha, storeSha, changes }, null, 2)}\n`,
    );
    await rename(temporaryPath, overlayPath);
    result = {
      integrationSha,
      storeSha,
      integrationBranch: branch,
      changeInputHashes,
      overlayPath,
    };
  } finally {
    try {
      await rm(temporary, { recursive: true, force: true });
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }
  return result;
}
