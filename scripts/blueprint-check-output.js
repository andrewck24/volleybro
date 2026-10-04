#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function checkBlueprintOutput(root) {
  const directory = path.join(root, "blueprint");
  const prepared = await readFile(
    path.join(directory, "public", "blueprint-build.json"),
    "utf8",
  );
  const exported = await readFile(
    path.join(directory, "out", "blueprint-build.json"),
    "utf8",
  );
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", "HEAD^{commit}"],
    { cwd: root },
  );
  if (
    prepared !== exported ||
    JSON.parse(exported).sourceSha !== stdout.trim()
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
