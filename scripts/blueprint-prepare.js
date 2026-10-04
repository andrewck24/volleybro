#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { prepareLifecycle } from "./blueprint-lifecycle.js";

const execFileAsync = promisify(execFile);

export async function prepareBlueprint(root) {
  const lifecycle = await prepareLifecycle(root);
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", "HEAD^{commit}"],
    {
      cwd: root,
    },
  );
  const { stdout: sourceChanges } = await execFileAsync(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd: root },
  );
  const receipt = {
    schemaVersion: 1,
    sourceSha: stdout.trim(),
    sourceDirty: sourceChanges.trim().length > 0,
    integrationSha: lifecycle.integrationSha,
    storeSha: lifecycle.storeSha,
    changeInputHashes: lifecycle.changeInputHashes,
  };
  const directory = path.join(root, "blueprint", "public");
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, "blueprint-build.json");
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`);
  await rename(temporary, destination);
  return receipt;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
  await prepareBlueprint(root);
}
