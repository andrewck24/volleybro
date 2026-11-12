#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

export const REQUIRED_CHECKS = ["Verify", "Vercel"];
const FAILED_STATES = new Set([
  "FAILURE",
  "CANCELLED",
  "ERROR",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE",
]);

const RUN_ID = /\/actions\/runs\/(\d+)\//;

function runId(check) {
  return Number(check.link?.match(RUN_ID)?.[1] ?? 0);
}

function currentEntry(checks, name) {
  const entries = checks.filter((c) => c.name === name);
  const fromRuns = entries.filter((c) => runId(c) > 0);
  if (fromRuns.length === 0) {
    return entries.find((c) => FAILED_STATES.has(c.state)) ?? entries[0];
  }
  const { workflow } = fromRuns[0];
  const latestRun = Math.max(
    ...checks
      .filter((c) => c.workflow === workflow && c.event === "pull_request")
      .map(runId),
  );
  return fromRuns.find((c) => runId(c) === latestRun);
}

export function assessReadiness({ checks, pr, head }) {
  if (pr.state === "MERGED") return { status: "merged" };
  if (pr.state !== "OPEN")
    return { status: "fail", reason: `PR is ${pr.state}` };
  if (pr.headRefOid !== head) {
    return {
      status: "fail",
      reason: `head moved from ${head} to ${pr.headRefOid}`,
    };
  }
  const required = REQUIRED_CHECKS.map((name) => [
    name,
    currentEntry(checks, name),
  ]);
  for (const [name, check] of required) {
    if (check && FAILED_STATES.has(check.state)) {
      return { status: "fail", reason: `${name} is ${check.state}` };
    }
  }
  if (pr.mergeStateStatus === "BEHIND") {
    return {
      status: "fail",
      reason: "branch is behind its base: merge origin/main, push and rerun",
    };
  }
  if (pr.mergeStateStatus === "DIRTY") {
    return { status: "fail", reason: "merge conflicts with its base" };
  }
  const pending = required
    .filter(([, check]) => check?.state !== "SUCCESS")
    .map(([name]) => name);
  if (pending.length > 0) {
    return { status: "wait", reason: `waiting for ${pending.join(", ")}` };
  }
  if (pr.mergeStateStatus !== "CLEAN") {
    return { status: "wait", reason: `merge state is ${pr.mergeStateStatus}` };
  }
  return { status: "ready" };
}

export function parseGhOutput(stdout) {
  return stdout.trim() === "" ? [] : JSON.parse(stdout);
}

async function ghJson(args) {
  try {
    return parseGhOutput((await execFileAsync("gh", args)).stdout);
  } catch (error) {
    const noChecksYet = /no checks reported/.test(error.stderr ?? "");
    if (error.stdout || noChecksYet) return parseGhOutput(error.stdout ?? "");
    throw error;
  }
}

function readPr(number) {
  return ghJson([
    "pr",
    "view",
    number,
    "--json",
    "state,headRefOid,mergeStateStatus",
  ]);
}

function readChecks(number) {
  return ghJson([
    "pr",
    "checks",
    number,
    "--json",
    "name,state,workflow,event,link",
  ]);
}

function option(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  const number = argv[0];
  if (!number || number.startsWith("--")) {
    console.error(
      "usage: pnpm pr:wait <number> [--head <sha>] [--interval <s>] [--timeout <s>]",
    );
    process.exit(2);
  }
  const interval = Number(option(argv, "--interval", "30")) * 1000;
  const timeout = Number(option(argv, "--timeout", "1800")) * 1000;
  if (!(interval > 0) || !(timeout > 0)) {
    console.error("--interval and --timeout take positive seconds");
    process.exit(2);
  }
  const deadline = Date.now() + timeout;
  const head = option(argv, "--head", (await readPr(number)).headRefOid);
  console.log(`PR #${number} head ${head}`);

  let last = "";
  for (;;) {
    let result;
    try {
      const [pr, checks] = await Promise.all([
        readPr(number),
        readChecks(number),
      ]);
      result = assessReadiness({ checks, pr, head });
    } catch (error) {
      result = { status: "wait", reason: `gh failed: ${error.message}` };
    }
    if (result.status === "ready" || result.status === "merged") {
      console.log(`${result.status}: ${head}`);
      return;
    }
    if (result.status === "fail") {
      console.error(`not mergeable: ${result.reason}`);
      process.exit(1);
    }
    if (result.reason !== last) console.log(result.reason);
    last = result.reason;
    if (Date.now() > deadline) {
      console.error(`timed out: ${result.reason}`);
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
