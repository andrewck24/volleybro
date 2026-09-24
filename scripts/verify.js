#!/usr/bin/env node
// Any change to root configuration runs every lane, because those files feed
// all of them; app-test starts only after app-build so the two do not compete
// for CPU and time out each other's waits.
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const LANE_COMMANDS = {
  static: [
    "pnpm format:check",
    "pnpm test:workflow",
    "pnpm check:workflow",
    "pnpm typecheck:strict",
    "pnpm lint",
  ],
  "app-build": ["pnpm build", "node scripts/assert-sw.js"],
  "app-test": ["pnpm test"],
  blueprint: ["pnpm --filter blueprint test", "pnpm --filter blueprint build"],
};

export const LANE_NAMES = Object.keys(LANE_COMMANDS);
export const LANE_AFTER = { "app-test": "app-build" };

const EVERY_LANE_EXACT = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  ".nvmrc",
  "blueprint/package.json",
]);
const EVERY_LANE_PATTERNS = [
  /^tsconfig.*\.json$/,
  /^jest\.config\./,
  /^eslint\.config\./,
  /^\.eslintrc/,
  /^\.prettierrc/,
  /^prettier\.config\./,
  /^next\.config\./,
  /^postcss\.config\./,
  /^tailwind\.config\./,
];

function affectsEveryLane(changedPath) {
  if (EVERY_LANE_EXACT.has(changedPath)) return true;
  if (changedPath.startsWith("scripts/")) return true;
  if (changedPath.startsWith(".github/")) return true;
  if (changedPath.includes("/")) return false;
  return EVERY_LANE_PATTERNS.some((pattern) => pattern.test(changedPath));
}

function allLanes(run, reason) {
  return Object.fromEntries(LANE_NAMES.map((lane) => [lane, { run, reason }]));
}

function isDocsOnly(changedPath) {
  return (
    changedPath.startsWith("blueprint/") ||
    changedPath.startsWith("docs/") ||
    changedPath.startsWith(".changeset/") ||
    /\.mdx?$/i.test(changedPath)
  );
}

export function planLanes(changedPaths, { all = false, full = false } = {}) {
  if (!all) {
    const plan = allLanes(false, "not part of default verify");
    plan.static = { run: true, reason: "default run" };
    plan["app-test"] = { run: true, reason: "default run" };
    return plan;
  }

  if (changedPaths === null) return allLanes(true, "no merge-base with dev");
  if (full) return allLanes(true, "full run requested");

  const widening = changedPaths.find(affectsEveryLane);
  if (widening) return allLanes(true, `${widening} changed`);

  const blueprintPath = changedPaths.find((p) => p.startsWith("blueprint/"));
  const appPath = changedPaths.find((p) => !isDocsOnly(p));
  const appLane = appPath
    ? { run: true, reason: `${appPath} changed` }
    : { run: false, reason: "no non-docs, non-blueprint changes" };

  return {
    static: { run: true, reason: "static analysis always runs" },
    "app-build": appLane,
    "app-test": appLane,
    blueprint: blueprintPath
      ? { run: true, reason: `${blueprintPath} changed` }
      : { run: false, reason: "no blueprint/ changes" },
  };
}

function git(args) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    encoding: "utf8",
  });
}

function getChangedPaths() {
  let mergeBase;
  try {
    mergeBase = git(["merge-base", "HEAD", "dev"]).trim();
  } catch {
    return null;
  }

  const diffPaths = git(["diff", "--name-only", mergeBase])
    .split("\n")
    .filter(Boolean);

  const statusPaths = git(["status", "--porcelain"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const entry = line.slice(3);
      const arrowIndex = entry.indexOf(" -> ");
      return arrowIndex === -1 ? entry : entry.slice(arrowIndex + 4);
    });

  return [...new Set([...diffPaths, ...statusPaths])];
}

function parseArgs(argv) {
  return {
    all: argv.includes("--all"),
    full: argv.includes("--full"),
    dryRun: argv.includes("--dry-run"),
  };
}

function prefixLines(laneName, stream) {
  let rest = "";
  return {
    write(chunk) {
      const lines = (rest + chunk.toString()).split("\n");
      rest = lines.pop();
      for (const line of lines) stream.write(`[${laneName}] ${line}\n`);
    },
    flush() {
      if (rest !== "") stream.write(`[${laneName}] ${rest}\n`);
      rest = "";
    },
  };
}

function runCommand(command, laneName, children) {
  const [cmd, ...args] = command.split(" ");
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    children.add(child);
    const out = prefixLines(laneName, process.stdout);
    const err = prefixLines(laneName, process.stderr);
    child.stdout.on("data", out.write);
    child.stderr.on("data", err.write);
    child.on("error", reject);
    child.on("close", (code) => {
      out.flush();
      err.flush();
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function runLane(laneName, children) {
  const start = Date.now();
  try {
    for (const command of LANE_COMMANDS[laneName]) {
      await runCommand(command, laneName, children);
    }
    return {
      lane: laneName,
      status: "pass",
      seconds: (Date.now() - start) / 1000,
    };
  } catch (error) {
    process.stderr.write(`[${laneName}] ${error.message}\n`);
    return {
      lane: laneName,
      status: "fail",
      seconds: (Date.now() - start) / 1000,
    };
  }
}

function printPlan(plan) {
  for (const lane of LANE_NAMES) {
    const { run, reason } = plan[lane];
    console.log(`${run ? "run " : "skip"}  ${lane}: ${reason}`);
  }
}

function printSummary(results) {
  console.log("\nlane        status  seconds");
  for (const { lane, status, seconds } of results) {
    console.log(`${lane.padEnd(11)} ${status.padEnd(7)} ${seconds.toFixed(1)}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const changedPaths = options.all ? getChangedPaths() : [];
  const plan = planLanes(changedPaths, options);

  printPlan(plan);
  if (options.dryRun) return;

  const children = new Set();
  const onSigint = () => {
    for (const child of children) child.kill("SIGINT");
    process.exit(130);
  };
  process.on("SIGINT", onSigint);

  const running = {};
  for (const lane of LANE_NAMES.filter((lane) => plan[lane].run)) {
    const after = running[LANE_AFTER[lane]];
    running[lane] = after
      ? after.then(() => runLane(lane, children))
      : runLane(lane, children);
  }
  const results = await Promise.all(Object.values(running));
  process.off("SIGINT", onSigint);

  const skipped = LANE_NAMES.filter((lane) => !plan[lane].run).map((lane) => ({
    lane,
    status: "skip",
    seconds: 0,
  }));
  printSummary([...results, ...skipped]);

  if (results.some((result) => result.status === "fail")) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
