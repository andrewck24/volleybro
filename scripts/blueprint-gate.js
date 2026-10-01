#!/usr/bin/env node
/*
 * Run a Blueprint gate for a Change (ADR-0084).
 *
 * Usage:
 *   node scripts/blueprint-gate.js <slug> [--gate G1]
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { publish } from "./blueprint-changes.js";
import { git, readChangeDir } from "./change-page.js";
import { checkGateBranchState } from "./check-workflow.js";

const execFileAsync = promisify(execFile);
const PREVIEW_HOST = "volleybro-blueprint.andrewck24.workers.dev";
const CHECK_WORKFLOW = fileURLToPath(
  new URL("./check-workflow.js", import.meta.url),
);

// Cloudflare's branch-preview host label.
export function previewUrl(branch, slug) {
  const label = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://${label}-${PREVIEW_HOST}/changes/${slug}`;
}

async function runCheckWorkflow(root, slug) {
  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [CHECK_WORKFLOW, "--gate", slug],
      { cwd: root },
    );
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    return true;
  } catch (error) {
    process.stdout.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    return false;
  }
}

// Fetched on demand rather than installed: cf pulls in the workerd runtime,
// which every CI job and deploy would otherwise download (ADR-0097).
const CF = "cf@^1.0.0-beta.5";

// Through pnpm's own entry script, which the gate's pnpm run sets, because
// Windows cannot spawn the pnpm shim without a shell.
async function runCf(root, args) {
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error("run the gate through pnpm blueprint:gate");
  const { stdout } = await execFileAsync(
    process.execPath,
    [pnpm, "dlx", CF, ...args],
    { cwd: path.join(root, "blueprint"), timeout: 120_000 },
  );
  return JSON.parse(stdout.slice(stdout.search(/[[{]/)));
}

const listOf = (value) =>
  Array.isArray(value) ? value : (value?.result ?? []);

async function workerName(root) {
  const config = await readFile(
    path.join(root, "blueprint", "wrangler.toml"),
    "utf8",
  );
  const name = config.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
  if (!name) throw new Error("blueprint/wrangler.toml names no Worker");
  return name;
}

// The preview trigger is the one that does not build the production branch.
function previewTrigger(triggers) {
  return listOf(triggers).find(
    (trigger) =>
      !(trigger.branch_includes ?? []).some((branch) =>
        ["dev", "main"].includes(branch),
      ),
  );
}

export async function rebuildPreview(root, branch, { cf = runCf } = {}) {
  try {
    const name = await workerName(root);
    const worker = listOf(
      await cf(root, ["workers", "scripts", "search", "--name", name]),
    ).find((script) => script.script_name === name);
    if (!worker) throw new Error(`no Worker named ${name}`);
    const trigger = previewTrigger(
      await cf(root, [
        "builds",
        "triggers",
        "list",
        "--external-script-id",
        worker.id,
      ]),
    );
    if (!trigger) throw new Error("no branch-preview trigger found");
    const started = await cf(root, [
      "builds",
      "create",
      trigger.trigger_uuid,
      "--body",
      JSON.stringify({ branch }),
    ]);
    const uuid = started.build_uuid ?? started.result?.build_uuid;
    const build = await cf(root, ["builds", "get", uuid]);
    const status = build.status ?? build.result?.status ?? "unknown";
    return `Branch preview build ${uuid} started (${status}); read it again with \`pnpm dlx ${CF} builds get ${uuid}\` before handing the gate over.`;
  } catch (error) {
    return `Could not start a branch preview build through cf: ${error.message.split("\n")[0]}. If cf is not signed in, run \`pnpm dlx ${CF} auth login\`; otherwise rerun the branch build from the Cloudflare dashboard.`;
  }
}

export async function runGate(
  cwd,
  slug,
  {
    g1 = false,
    runCheck = (s) => runCheckWorkflow(cwd, s),
    rebuild = rebuildPreview,
  } = {},
) {
  const root = await git(cwd, ["rev-parse", "--show-toplevel"]);

  const blocked = await checkGateBranchState(root);
  if (blocked.length > 0) {
    for (const diagnostic of blocked) console.error(`- ${diagnostic}`);
    process.exitCode = 1;
    return;
  }

  const slugDir = path.join(root, "blueprint", "content", "changes", slug);
  // The frozen check reads the latest G1 publish (ADR-0095).
  if (g1 && (await readChangeDir(slugDir)).reviews.length > 0) {
    await publish(root, slug, { proposalOnly: true });
  }
  await publish(root, slug);

  if (!(await runCheck(slug))) {
    process.exitCode = 1;
    return;
  }

  const facts = JSON.parse(
    await readFile(path.join(slugDir, "facts.json"), "utf8"),
  );
  const branch = await git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  console.log(
    `Branch preview: ${previewUrl(branch, slug)} should show ${facts.commits} commits; verify the latest rendered content and diagrams before human acceptance. A matching header alone does not prove freshness.`,
  );
  console.log(await rebuild(root, branch));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [slug, ...rest] = process.argv.slice(2);
  const gateIndex = rest.indexOf("--gate");
  const gate = gateIndex === -1 ? undefined : rest[gateIndex + 1];
  if (!slug || (gate !== undefined && gate !== "G1")) {
    console.error("Usage: blueprint-gate.js <slug> [--gate G1]");
    process.exitCode = 1;
  } else {
    runGate(process.cwd(), slug, { g1: gate === "G1" }).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}
