#!/usr/bin/env node
/*
 * Run a Blueprint gate for a Change (ADR-0084).
 *
 * Usage:
 *   node scripts/blueprint-gate.js <slug> [--gate G1] [--preview]
 */
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { publish } from "./blueprint-changes.js";
import { changeInputHash } from "./blueprint-lifecycle.js";
import { previewAlias } from "./blueprint-preview.js";
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
  const label = previewAlias(branch);
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

async function runGh(root, args) {
  const { stdout } = await execFileAsync("gh", args, {
    cwd: root,
    timeout: 120_000,
  });
  if (args[0] === "workflow") return stdout.trim();
  return stdout.trim() ? JSON.parse(stdout) : null;
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
  expectedStoreSha,
  expectedIntegrationSha,
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
        if (
          !validReceipt(receipt, slug, inputHash, expectedSourceSha) ||
          (expectedStoreSha && receipt.storeSha !== expectedStoreSha) ||
          (expectedIntegrationSha &&
            receipt.integrationSha !== expectedIntegrationSha)
        ) {
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

export async function rebuildPreview(
  root,
  branch,
  slug,
  inputHash,
  {
    gh = runGh,
    fetchHosted = fetch,
    wait = sleep,
    now = Date.now,
    timeoutMs = PROOF_TIMEOUT_MS,
    expectedSourceSha,
  } = {},
) {
  const sourceSha =
    expectedSourceSha ?? (await git(root, ["rev-parse", "HEAD^{commit}"]));
  const refs = await git(root, [
    "ls-remote",
    "origin",
    "refs/heads/main",
    "refs/heads/blueprint-changes",
  ]);
  const shaFor = (name) =>
    refs
      .split("\n")
      .find((line) => line.endsWith("\trefs/heads/" + name))
      ?.split("\t")[0];
  const integrationSha = shaFor("main");
  const storeSha = shaFor("blueprint-changes");
  if (
    ![sourceSha, integrationSha, storeSha].every((sha) =>
      /^[0-9a-f]{40}$/.test(sha ?? ""),
    )
  )
    throw new Error(
      "Cannot resolve the exact source, integration and store snapshots",
    );
  const requestId = randomUUID();
  const title = "Blueprint Preview " + requestId;
  try {
    await gh(root, [
      "workflow",
      "run",
      "blueprint-preview.yml",
      "--ref",
      "main",
      "-f",
      "source_sha=" + sourceSha,
      "-f",
      "store_sha=" + storeSha,
      "-f",
      "integration_sha=" + integrationSha,
      "-f",
      "branch=" + branch,
      "-f",
      "slug=" + slug,
      "-f",
      "input_hash=" + inputHash,
      "-f",
      "request_id=" + requestId,
    ]);
  } catch (error) {
    throw new Error(
      "Could not dispatch Blueprint Preview through GitHub: " +
        error.message.split("\n")[0],
    );
  }
  const startedAt = now();
  let run;
  while (now() - startedAt < timeoutMs) {
    const runs = await gh(root, [
      "run",
      "list",
      "--workflow",
      "blueprint-preview.yml",
      "--event",
      "workflow_dispatch",
      "--limit",
      "100",
      "--json",
      "databaseId,displayTitle,status,conclusion,headSha",
    ]);
    run = runs.find((candidate) => candidate.displayTitle === title);
    if (run && run.headSha !== integrationSha)
      throw new Error(
        "Preview controller changed during dispatch; retry with current main",
      );
    if (run?.status === "completed") {
      if (run.conclusion !== "success")
        throw new Error(
          "Branch preview run " +
            run.databaseId +
            " stopped with outcome " +
            run.conclusion,
        );
      break;
    }
    await wait(Math.min(POLL_INTERVAL_MS, timeoutMs - (now() - startedAt)));
  }
  if (run?.status !== "completed")
    throw new Error("Timed out waiting for Blueprint Preview run " + requestId);
  const proof = await waitForHostedProof({
    host: new URL(previewUrl(branch, slug)).origin,
    slug,
    inputHash,
    expectedSourceSha: sourceSha,
    expectedStoreSha: storeSha,
    expectedIntegrationSha: integrationSha,
    fetchHosted,
    wait,
    now,
    timeoutMs: Math.max(1, timeoutMs - (now() - startedAt)),
  });
  return { build: run.databaseId, ...proof };
}

export async function runGate(
  cwd,
  slug,
  {
    g1 = false,
    preview = false,
    runCheck = (s) => runCheckWorkflow(cwd, s),
    gh = runGh,
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
        gh,
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
