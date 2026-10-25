#!/usr/bin/env node
// Any change to root configuration runs every lane, because those files feed
// all of them.
import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveScopeBase } from "./git-scope.js";

export const LANE_COMMANDS = {
  static: [
    "pnpm format:check",
    "node scripts/design-document.js --check",
    "pnpm check:workflow",
    "pnpm typecheck:strict",
    "pnpm lint",
  ],
  workflow: ["pnpm test:workflow"],
  integration: ["pnpm test:integration"],
  "app-build": ["pnpm build", "node scripts/assert-sw.js"],
  "app-test": ["pnpm test"],
  blueprint: [
    "pnpm --filter blueprint test",
    "pnpm --filter blueprint test:persistence",
    "pnpm --filter blueprint build",
  ],
};

export const LANE_NAMES = Object.keys(LANE_COMMANDS);
// The component tests wait on real timers with Jest's five-second timeout, and
// Blueprint Jest workers can segfault while competing with build lanes. Run
// both suites after the parallel lanes; CI gives them their own runners.
const SOLO_LANES = ["blueprint", "app-test"];

// Each lane's full output lands here, so a filtered terminal view never loses
// a failure message. Cleared per run so no log outlives the run it describes.
const LOG_DIR = ".verify-logs";
const JEST_LANES = new Set(["app-test", "integration", "blueprint"]);

// Node 24.15's V8 intermittently crashes a Jest worker, failing whichever
// suite it ran: not a test failure, so the lane reruns once. Recheck after a
// Node upgrade.
export function isWorkerSegfault(laneName, output) {
  return (
    JEST_LANES.has(laneName) &&
    /terminated by another process: signal=SIGSEGV/.test(output)
  );
}

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

// The scripts the app build runs; every other script is workflow tooling.
const APP_SCRIPTS = new Set([
  "scripts/assert-sw.js",
  "scripts/generate-icons.js",
]);
const INTEGRATION_PATTERNS = [
  /^src\/(entities|applications|infrastructure|interface|lib)\//,
  /^src\/app\/api\//,
  /^test\/integration\//,
  /^test\/setup\/integration\./,
];

function affectsEveryLane(changedPath) {
  if (EVERY_LANE_EXACT.has(changedPath)) return true;
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

function isWorkflowTooling(changedPath) {
  if (changedPath.startsWith(".github/")) return true;
  return changedPath.startsWith("scripts/") && !APP_SCRIPTS.has(changedPath);
}

function isIntegrationOnly(changedPath) {
  return (
    changedPath.startsWith("test/integration/") ||
    changedPath.startsWith("test/setup/integration.")
  );
}

function laneFor(changedPath, reasonWhenNone) {
  return changedPath
    ? { run: true, reason: `${changedPath} changed` }
    : { run: false, reason: reasonWhenNone };
}

export function planLanes(changedPaths, { all = false, full = false } = {}) {
  if (!all) {
    const plan = allLanes(false, "not part of default verify");
    plan.static = { run: true, reason: "default run" };
    plan["app-test"] = { run: true, reason: "default run" };
    return plan;
  }

  if (changedPaths === null) return allLanes(true, "no integration merge-base");
  if (full) return allLanes(true, "full run requested");

  const widening = changedPaths.find(affectsEveryLane);
  if (widening) return allLanes(true, `${widening} changed`);

  const code = changedPaths.filter((p) => !isDocsOnly(p));
  const appLane = laneFor(
    code.find((p) => !isWorkflowTooling(p) && !isIntegrationOnly(p)),
    "no app changes",
  );

  return {
    static: { run: true, reason: "static analysis always runs" },
    workflow: laneFor(
      code.find(isWorkflowTooling),
      "no scripts/ or .github/ changes",
    ),
    integration: laneFor(
      code.find((p) => INTEGRATION_PATTERNS.some((re) => re.test(p))),
      "no backend or integration-test changes",
    ),
    "app-build": appLane,
    "app-test": appLane,
    blueprint: laneFor(
      changedPaths.find((p) => p.startsWith("blueprint/")),
      "no blueprint/ changes",
    ),
  };
}

export function laneStages(plan) {
  const running = LANE_NAMES.filter((lane) => plan[lane].run);
  const together = running.filter((lane) => !SOLO_LANES.includes(lane));
  const serialized = SOLO_LANES.filter((lane) => running.includes(lane));
  return [
    ...(together.length > 0 ? [together] : []),
    ...serialized.map((lane) => [lane]),
  ];
}

function git(args) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    encoding: "utf8",
  });
}

async function getChangedPaths() {
  let mergeBase;
  try {
    mergeBase = git([
      "merge-base",
      "HEAD",
      await resolveScopeBase(process.cwd()),
    ]).trim();
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

function runCommand(command, laneName, children, sink) {
  return new Promise((resolve, reject) => {
    // Through a shell: on Windows pnpm is a .cmd shim, which spawn cannot run.
    const child = spawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(child);
    const out = prefixLines(laneName, process.stdout);
    const err = prefixLines(laneName, process.stderr);
    child.stdout.on("data", (chunk) => {
      sink(chunk);
      out.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      sink(chunk);
      err.write(chunk);
    });
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

export async function withSegfaultRerun(laneName, runOnce) {
  const first = await runOnce();
  if (first.ok || !isWorkerSegfault(laneName, first.output)) {
    return { attempt: first, retried: false };
  }
  process.stderr.write(
    `[${laneName}] a Jest worker died with SIGSEGV; rerunning the lane once\n`,
  );
  return { attempt: await runOnce(), retried: true };
}

async function runAttempt(laneName, children, log) {
  let output = "";
  const sink = (chunk) => {
    log.write(chunk);
    output += chunk;
  };
  try {
    for (const command of LANE_COMMANDS[laneName]) {
      await runCommand(command, laneName, children, sink);
    }
    return { ok: true, output };
  } catch (error) {
    process.stderr.write(`[${laneName}] ${error.message}\n`);
    return { ok: false, output };
  }
}

async function runLane(laneName, children) {
  const start = Date.now();
  mkdirSync(LOG_DIR, { recursive: true });
  const logPath = `${LOG_DIR}/${laneName}.log`;
  const log = createWriteStream(logPath);
  let runs = 0;
  const { attempt, retried } = await withSegfaultRerun(laneName, () => {
    if (runs++ > 0) log.write("\n--- rerun after a Jest worker SIGSEGV ---\n");
    return runAttempt(laneName, children, log);
  });
  await new Promise((resolve) => log.end(resolve));
  return {
    lane: laneName,
    status: attempt.ok ? "pass" : "fail",
    retried,
    log: logPath,
    seconds: (Date.now() - start) / 1000,
  };
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
  for (const { lane, status, retried, log } of results) {
    if (retried) console.log(`${lane}: rerun once after a Jest worker SIGSEGV`);
    if (status === "fail") console.log(`${lane}: full output in ${log}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const changedPaths = options.all ? await getChangedPaths() : [];
  const plan = planLanes(changedPaths, options);

  printPlan(plan);
  if (options.dryRun) return;
  rmSync(LOG_DIR, { recursive: true, force: true });

  const children = new Set();
  const onSigint = () => {
    for (const child of children) child.kill("SIGINT");
    process.exit(130);
  };
  process.on("SIGINT", onSigint);

  const results = [];
  for (const stage of laneStages(plan)) {
    results.push(
      ...(await Promise.all(stage.map((lane) => runLane(lane, children)))),
    );
  }
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
