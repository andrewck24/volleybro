#!/usr/bin/env node
import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REPOSITORY = "andrewck24/volleybro";
const REMOTE = `https://github.com/${REPOSITORY}.git`;
const WORKER = "volleybro-blueprint";
const WRANGLER_VERSION = "4.147.0";
const COMPATIBILITY_DATE = "2026-07-01";
const SHA = /^[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BRANCH =
  /^(?:feat|fix|refactor|fast|hotfix|test)\/[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/;

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function readInputs(env = process.env) {
  const input = {
    branch: requireValue(env.INPUT_BRANCH, "branch"),
    sourceSha: requireValue(env.INPUT_SOURCE_SHA, "source_sha"),
    storeSha: requireValue(env.INPUT_STORE_SHA, "store_sha"),
    integrationSha: requireValue(env.INPUT_INTEGRATION_SHA, "integration_sha"),
    slug: requireValue(env.INPUT_SLUG, "slug"),
    inputHash: requireValue(env.INPUT_HASH, "input_hash"),
    requestId: requireValue(env.INPUT_REQUEST_ID, "request_id"),
  };
  if (
    !BRANCH.test(input.branch) ||
    input.branch.includes("..") ||
    input.branch.includes("//") ||
    input.branch.endsWith(".lock")
  ) {
    throw new Error("branch must be a supported named branch");
  }
  previewAlias(input.branch);
  for (const [name, value] of [
    ["source_sha", input.sourceSha],
    ["store_sha", input.storeSha],
    ["integration_sha", input.integrationSha],
  ]) {
    if (!SHA.test(value))
      throw new Error(`${name} must be a full lowercase commit SHA`);
  }
  if (!SLUG.test(input.slug))
    throw new Error("slug must be lowercase kebab-case");
  if (!HASH.test(input.inputHash))
    throw new Error("input_hash must be a full SHA-256 hash");
  if (!REQUEST_ID.test(input.requestId))
    throw new Error("request_id is malformed");
  return input;
}

function requireTrustedDispatch(env = process.env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY) {
    throw new Error(`workflow must run in ${REPOSITORY}`);
  }
  if (
    env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    env.GITHUB_REF !== "refs/heads/main"
  ) {
    throw new Error("workflow dispatch is allowed only from trusted main");
  }
}

async function currentBranchSha(branch) {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-remote", "--heads", REMOTE],
    { timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  const refs = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(/\s+/));
  const label = previewAlias(branch);
  for (const [, ref] of refs) {
    const other = ref.slice("refs/heads/".length);
    if (
      other !== branch &&
      other
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") === label
    )
      throw new Error(
        "ambiguous preview alias: another public branch shares this URL",
      );
  }
  const sha = refs.find(([, ref]) => ref === `refs/heads/${branch}`)?.[0];
  if (!SHA.test(sha ?? ""))
    throw new Error("public branch did not resolve to a full commit SHA");
  return sha;
}

async function requirePublicCommitShas(shas) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "blueprint-preview-git-"),
  );
  try {
    await execFileAsync("git", ["init", "--bare", "--quiet", directory]);
    for (const sha of new Set(shas)) {
      await execFileAsync(
        "git",
        [
          "--git-dir",
          directory,
          "fetch",
          "--quiet",
          "--no-tags",
          "--depth=1",
          "--filter=blob:none",
          REMOTE,
          sha,
        ],
        {
          timeout: 60_000,
          maxBuffer: 1024 * 1024,
        },
      );
      await execFileAsync("git", [
        "--git-dir",
        directory,
        "cat-file",
        "-e",
        `${sha}^{commit}`,
      ]);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function validateRequest(env = process.env) {
  requireTrustedDispatch(env);
  const input = readInputs(env);
  const currentSha = await currentBranchSha(input.branch);
  if (currentSha !== input.sourceSha) {
    throw new Error("source_sha is no longer the current public branch head");
  }
  await requirePublicCommitShas([
    input.sourceSha,
    input.storeSha,
    input.integrationSha,
  ]);
  return input;
}

async function validateTree(directory) {
  const root = await lstat(directory);
  if (!root.isDirectory())
    throw new Error("artifact output must be a real directory");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const info = await lstat(fullPath);
    if (info.isSymbolicLink())
      throw new Error(`artifact contains a symbolic link: ${entry.name}`);
    if (info.isDirectory()) await validateTree(fullPath);
    else if (!info.isFile())
      throw new Error(`artifact contains a special file: ${entry.name}`);
  }
}

export async function validateArtifact(directory, input) {
  await validateTree(directory);
  const receipt = JSON.parse(
    await readFile(path.join(directory, "blueprint-build.json"), "utf8"),
  );
  if (
    receipt.schemaVersion !== 1 ||
    receipt.sourceSha !== input.sourceSha ||
    receipt.storeSha !== input.storeSha ||
    receipt.integrationSha !== input.integrationSha ||
    receipt.sourceDirty !== false ||
    receipt.changeInputHashes?.[input.slug] !== input.inputHash
  ) {
    throw new Error(
      "Blueprint artifact receipt does not match the requested snapshots",
    );
  }
  return receipt;
}

export function previewAlias(branch) {
  const alias = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!alias) throw new Error("branch cannot produce a preview alias");
  if (alias.length + 1 + WORKER.length > 63)
    throw new Error(
      "normalized branch preview alias exceeds the DNS label limit",
    );
  return alias;
}

async function revalidateBranch(input) {
  requireTrustedDispatch(process.env);
  const latestSha = await currentBranchSha(input.branch);
  if (latestSha !== input.sourceSha) {
    throw new Error(
      "source branch changed after the preview request; refusing upload",
    );
  }
}

async function writeGitHubOutput(values, env = process.env) {
  if (!env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is not set");
  await writeFile(
    env.GITHUB_OUTPUT,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
    { flag: "a" },
  );
}

async function prepareUpload(input, env = process.env) {
  const artifact = requireValue(
    env.PREVIEW_ARTIFACT_DIR,
    "PREVIEW_ARTIFACT_DIR",
  );
  await validateArtifact(artifact, input);
  await revalidateBranch(input);
  const accountId = requireValue(
    env.CLOUDFLARE_ACCOUNT_ID,
    "CLOUDFLARE_ACCOUNT_ID",
  );
  if (!/^[0-9a-f]{32}$/i.test(accountId))
    throw new Error("Cloudflare account ID must be 32 hexadecimal characters");
  const configPath = requireValue(
    env.WRANGLER_CONFIG_PATH,
    "WRANGLER_CONFIG_PATH",
  );
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(
    configPath,
    `${JSON.stringify({ name: WORKER, account_id: accountId, compatibility_date: COMPATIBILITY_DATE }, null, 2)}\n`,
    { mode: 0o600 },
  );
  await writeGitHubOutput({ alias: previewAlias(input.branch) }, env);
}

async function upload(input, env = process.env) {
  requireTrustedDispatch(env);
  const artifact = requireValue(
    env.PREVIEW_ARTIFACT_DIR,
    "PREVIEW_ARTIFACT_DIR",
  );
  await validateArtifact(artifact, input);
  const token = requireValue(env.CLOUDFLARE_API_TOKEN, "CLOUDFLARE_API_TOKEN");
  const cli = requireValue(env.WRANGLER_CLI, "WRANGLER_CLI");
  const configPath = requireValue(
    env.WRANGLER_CONFIG_PATH,
    "WRANGLER_CONFIG_PATH",
  );
  const alias = previewAlias(input.branch);
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [
      cli,
      "versions",
      "upload",
      "--config",
      configPath,
      "--assets",
      artifact,
      "--name",
      WORKER,
      "--preview-alias",
      alias,
      "--strict",
    ],
    {
      env: { ...env, CLOUDFLARE_API_TOKEN: token },
      timeout: 10 * 60 * 1000,
      maxBuffer: 8 * 1024 * 1024,
      cwd: path.dirname(configPath),
    },
  );
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

async function main(command) {
  if (command === "validate-request") {
    const input = await validateRequest();
    console.log(`Request accepted: ${input.requestId}`);
    return;
  }
  const input = readInputs();
  if (command === "validate-artifact") {
    await validateArtifact(
      requireValue(process.env.PREVIEW_ARTIFACT_DIR, "PREVIEW_ARTIFACT_DIR"),
      input,
    );
    console.log("Blueprint artifact receipt and files are valid");
    return;
  }
  if (command === "revalidate-branch") {
    await revalidateBranch(input);
    console.log("Source branch still points to the requested SHA");
    return;
  }
  if (command === "prepare-upload") {
    await prepareUpload(input);
    console.log(`Prepared isolated Wrangler config (${WRANGLER_VERSION})`);
    return;
  }
  if (command === "upload") {
    await upload(input);
    console.log(`Uploaded preview version for ${input.requestId}`);
    return;
  }
  throw new Error(
    "Usage: blueprint-preview.js <validate-request|validate-artifact|revalidate-branch|prepare-upload|upload>",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch((error) => {
    console.error(`Blueprint preview failed: ${error.message}`);
    process.exitCode = 1;
  });
}
