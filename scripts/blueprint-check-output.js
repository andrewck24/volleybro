#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { changeInputHash } from "./blueprint-lifecycle.js";

const execFileAsync = promisify(execFile);

export async function checkBlueprintOutput(root) {
  const directory = path.join(root, "blueprint");
  const prepared = await readFile(
    path.join(directory, "public", "blueprint-build.json"),
    "utf8",
  );
  const exported = await readFile(
    path.join(directory, "dist", "blueprint-build.json"),
    "utf8",
  );
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", "HEAD^{commit}"],
    { cwd: root },
  );
  const receipt = JSON.parse(exported);
  const { stdout: sourceChanges } = await execFileAsync(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd: root },
  );
  const inputs = {};
  const changes = path.join(directory, "content", "changes");
  for (const entry of await readdir(changes, { withFileTypes: true })) {
    if (entry.isDirectory())
      inputs[entry.name] = await changeInputHash(
        path.join(changes, entry.name),
      );
  }
  const hashesMatch =
    Object.keys(inputs).length ===
      Object.keys(receipt.changeInputHashes ?? {}).length &&
    Object.entries(inputs).every(
      ([slug, hash]) => receipt.changeInputHashes?.[slug] === hash,
    );
  if (
    prepared !== exported ||
    receipt.sourceSha !== stdout.trim() ||
    receipt.sourceDirty !== false ||
    sourceChanges.trim().length > 0 ||
    !hashesMatch
  ) {
    throw new Error(
      "Blueprint output is stale; run pnpm --filter blueprint build before deployment",
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await checkBlueprintOutput(
    path.resolve(fileURLToPath(new URL("..", import.meta.url))),
  );
}
