#!/usr/bin/env node
/*
 * Run a Blueprint gate for a Change (ADR-0084).
 *
 * Usage:
 *   node scripts/blueprint-gate.js <slug> [--gate G1] [--preview]
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { publish } from "./blueprint-changes.js";
import { changeInputHash } from "./blueprint-lifecycle.js";
import { checkGateBranchState } from "./check-workflow.js";
import { git, readChangeDir } from "./change-page.js";

const execFileAsync = promisify(execFile);
const MAIN_HOST = "https://volleybro-blueprint.andrewck24.workers.dev";
const PREVIEW_HOST = "volleybro-blueprint.andrewck24.workers.dev";
const POLL_INTERVAL_MS = 10_000;
const PROOF_TIMEOUT_MS = 45 * 60_000;
const CHECK_WORKFLOW = fileURLToPath(
  new URL("./check-workflow.js", import.meta.url),
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runCf(root, args) {
  const options = { cwd: path.join(root, "blueprint"), timeout: 120_000 };
  let result;
  try {
    result = await execFileAsync("cf", args, options);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const pnpm = process.env.npm_execpath;
    if (!pnpm) throw new Error("run the gate through pnpm blueprint:gate");
    const isScript = /\.[cm]?js$/i.test(pnpm);
    result = await execFileAsync(
      isScript ? process.execPath : pnpm,
      [...(isScript ? [pnpm] : []), "dlx", CF, ...args],
      options,
    );
  }
  const { stdout } = result;
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

function previewTrigger(triggers) {
  return listOf(triggers).find((trigger) =>
    (trigger.branch_includes ?? []).includes("*"),
  );
}

function validReceipt(receipt, slug, inputHash, expectedSourceSha) {
  const sha = /^[0-9a-f]{40}$/;
  return (
    receipt?.schemaVersion === 1 &&
    sha.test(receipt.sourceSha ?? "") &&
    (!expectedSourceSha || receipt.sourceSha === expectedSourceSha) &&
    sha.test(receipt.integrationSha ?? "") &&
    sha.test(receipt.storeSha ?? "") &&
    receipt.changeInputHashes?.[slug] === inputHash
  );
}

function responseSummary(response) {
  return `HTTP ${response.status}`;
}

export async function waitForHostedProof({
  host,
  slug,
  inputHash,
  expectedSourceSha,
  fetchHosted = fetch,
  wait = sleep,
  now = Date.now,
  timeoutMs = PROOF_TIMEOUT_MS,
}) {
  const pageUrl = `${host}/changes/${encodeURIComponent(slug)}`;
  const receiptUrl = `${host}/blueprint-build.json`;
  const startedAt = now();
  let lastObservation = "no hosted response";
  let attempts = 0;

  for (;;) {
    if (attempts > 0 && now() - startedAt >= timeoutMs) break;
    attempts += 1;
    const requestOptions = () => ({
      cache: "no-store",
      signal: AbortSignal.timeout(
        Math.max(1, Math.min(30_000, timeoutMs - (now() - startedAt))),
      ),
    });
    try {
      const receiptResponse = await fetchHosted(
        `${receiptUrl}?run=${encodeURIComponent(String(now()))}`,
        requestOptions(),
      );
      if (!receiptResponse.ok) {
        lastObservation = `build receipt ${responseSummary(receiptResponse)}`;
      } else {
        const receipt = await receiptResponse.json();
        if (!validReceipt(receipt, slug, inputHash, expectedSourceSha)) {
          lastObservation =
            "build receipt does not match the published page inputs";
        } else {
          const pageResponse = await fetchHosted(
            `${pageUrl}?run=${encodeURIComponent(String(now()))}`,
            requestOptions(),
          );
          if (pageResponse.ok) {
            const html = await pageResponse.text();
            if (!html.includes('data-blueprint-render-error="true"'))
              return { pageUrl, receipt };
            lastObservation = "Change page contains a tab render failure";
          } else {
            lastObservation = `Change page ${responseSummary(pageResponse)}`;
          }
        }
      }
    } catch (error) {
      lastObservation = `hosted request failed: ${error.message}`;
    }

    if (now() - startedAt >= timeoutMs) break;
    await wait(Math.min(POLL_INTERVAL_MS, timeoutMs - (now() - startedAt)));
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for hosted Blueprint proof for ${pageUrl}: ${lastObservation}. The page is not ready for human acceptance.`,
  );
}

async function waitForPreviewBuild(root, uuid, { cf, wait, now, timeoutMs }) {
  const startedAt = now();
  let lastStatus = "unknown";
  for (;;) {
    if (now() - startedAt >= timeoutMs) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for branch preview build ${uuid} (last status: ${lastStatus})`,
      );
    }
    const build = await cf(root, ["builds", "get", uuid]);
    const result = build.result ?? build;
    lastStatus = result.status ?? "unknown";
    if (lastStatus === "stopped") {
      if (result.build_outcome !== "success") {
        throw new Error(
          `Branch preview build ${uuid} stopped with outcome ${result.build_outcome ?? "unknown"}`,
        );
      }
      return;
    }
    await wait(Math.min(POLL_INTERVAL_MS, timeoutMs - (now() - startedAt)));
  }
}

export async function rebuildPreview(
  root,
  branch,
  slug,
  inputHash,
  {
    cf = runCf,
    fetchHosted = fetch,
    wait = sleep,
    now = Date.now,
    timeoutMs = PROOF_TIMEOUT_MS,
    expectedSourceSha,
  } = {},
) {
  let uuid;
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
    uuid = started.build_uuid ?? started.result?.build_uuid;
    if (!uuid) throw new Error("Cloudflare returned no build UUID");
  } catch (error) {
    throw new Error(
      `Could not start a branch preview build through cf: ${error.message.split("\n")[0]}. If cf is not signed in, run \`pnpm dlx ${CF} auth login\`; otherwise rerun the branch build from the Cloudflare dashboard.`,
    );
  }

  await waitForPreviewBuild(root, uuid, { cf, wait, now, timeoutMs });
  const host = new URL(previewUrl(branch, slug)).origin;
  const proof = await waitForHostedProof({
    host,
    slug,
    inputHash,
    expectedSourceSha,
    fetchHosted,
    wait,
    now,
    timeoutMs,
  });
  return { build: uuid, ...proof };
}

export async function runGate(
  cwd,
  slug,
  {
    g1 = false,
    preview = false,
    runCheck = (s) => runCheckWorkflow(cwd, s),
    cf = runCf,
    fetchHosted = fetch,
    wait = sleep,
    now = Date.now,
    timeoutMs = PROOF_TIMEOUT_MS,
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
  const inputHash = await changeInputHash(slugDir);
  const expectedSourceSha = preview
    ? await git(root, ["rev-parse", "HEAD^{commit}"])
    : undefined;
  const proof = preview
    ? await rebuildPreview(root, branch, slug, inputHash, {
        cf,
        expectedSourceSha,
        fetchHosted,
        wait,
        now,
        timeoutMs,
      })
    : await waitForHostedProof({
        host: MAIN_HOST,
        slug,
        inputHash,
        fetchHosted,
        wait,
        now,
        timeoutMs,
      });

  const mode = preview ? `Branch preview build ${proof.build}` : "Production";
  console.log(
    `${mode} hosted proof verified: ${proof.pageUrl} (source ${proof.receipt.sourceSha.slice(0, 8)}, store ${proof.receipt.storeSha.slice(0, 8)}). The hosted receipt matches this complete Change page and the page request succeeded; ${facts.commits} commits are included.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [slug, ...rest] = process.argv.slice(2);
  const gateIndex = rest.indexOf("--gate");
  const gate = gateIndex === -1 ? undefined : rest[gateIndex + 1];
  const allowed = new Set(["--gate", "G1", "--preview"]);
  const unknown = rest.filter((arg) => !allowed.has(arg));
  if (
    !slug ||
    unknown.length > 0 ||
    (gate !== undefined && gate !== "G1") ||
    (gateIndex !== -1 && gate === undefined)
  ) {
    console.error("Usage: blueprint-gate.js <slug> [--gate G1] [--preview]");
    process.exitCode = 1;
  } else {
    runGate(process.cwd(), slug, {
      g1: gate === "G1",
      preview: rest.includes("--preview"),
    }).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}
