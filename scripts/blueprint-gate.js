#!/usr/bin/env node
/*
 * Run a Blueprint gate for a Change (ADR-0084).
 *
 * Usage:
 *   node scripts/blueprint-gate.js <slug> [--gate G1]
 */
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { publish } from "./blueprint-changes.js";
import { git, hasReview, withoutReview } from "./change-page.js";
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

export async function runGate(
  cwd,
  slug,
  { g1 = false, runCheck = (s) => runCheckWorkflow(cwd, s) } = {},
) {
  const root = await git(cwd, ["rev-parse", "--show-toplevel"]);

  const blocked = await checkGateBranchState(root);
  if (blocked.length > 0) {
    for (const diagnostic of blocked) console.error(`- ${diagnostic}`);
    process.exitCode = 1;
    return;
  }

  const slugDir = path.join(root, "blueprint", "content", "changes", slug);
  const pagePath = path.join(slugDir, "index.mdx");
  const content = await readFile(pagePath, "utf8");
  // The frozen-Proposal check reads the latest G1 publish (ADR-0075).
  if (g1 && hasReview(content)) {
    await writeFile(pagePath, withoutReview(content));
    try {
      await publish(root, slug);
    } finally {
      await writeFile(pagePath, content);
    }
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
    `Branch preview: ${previewUrl(branch, slug)} is current once its header shows ${facts.commits} commits; rerun the branch build if it does not.`,
  );
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
