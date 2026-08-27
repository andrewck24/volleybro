#!/usr/bin/env node
/*
 * Launch blueprint from any checkout: lists every git worktree that
 * contains blueprint/, prompts when there is more than one, installs
 * dependencies on first run, then forwards the args to `pnpm <args>`
 * (default: dev) inside the chosen blueprint/.
 *
 * Usage: pnpm blueprint [dev|build|start|...]
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

const args = process.argv.slice(2);
const cmd = args.length > 0 ? args : ["dev"];

let list;
try {
  list = execSync("git worktree list --porcelain", { encoding: "utf8" });
} catch {
  console.error(
    "Failed to list git worktrees — run inside the repository with git on PATH.",
  );
  process.exit(1);
}
const roots = list
  .split("\n")
  .filter((line) => line.startsWith("worktree "))
  .map((line) => line.slice("worktree ".length));
const candidates = roots.filter((root) =>
  existsSync(join(root, "blueprint", "package.json")),
);

if (candidates.length === 0) {
  console.error("No worktree contains blueprint/package.json.");
  process.exit(1);
}

let target = candidates[0];
if (candidates.length > 1) {
  console.log("Multiple worktrees contain blueprint/:");
  candidates.forEach((c, i) => console.log(`  [${i + 1}] ${c}`));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `Select worktree [1-${candidates.length}] (default 1): `,
  );
  rl.close();
  const n = Number.parseInt(answer, 10);
  if (Number.isInteger(n) && n >= 1 && n <= candidates.length) {
    target = candidates[n - 1];
  }
}

if (!existsSync(join(target, "node_modules"))) {
  console.log(`Installing dependencies in ${target} ...`);
  const install = spawnSync("pnpm", ["install"], {
    cwd: target,
    stdio: "inherit",
  });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

console.log(`blueprint @ ${target} → pnpm ${cmd.join(" ")}`);
const result = spawnSync("pnpm", cmd, {
  cwd: join(target, "blueprint"),
  stdio: "inherit",
});
process.exit(result.status ?? 0);
