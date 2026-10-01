#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateRequiredChecks } from "./release-controls.js";

const ALLOWLIST = ["@types/jest-axe"];
const BOT_ID = 49699333;

function command(bin, args, options = {}) {
  return execFileSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
    ...options,
  }).trim();
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function patchVersion(before, after) {
  const a = /^(\^|~)?(\d+)\.(\d+)\.(\d+)$/.exec(before);
  const b = /^(\^|~)?(\d+)\.(\d+)\.(\d+)$/.exec(after);
  return (
    a &&
    b &&
    a[1] === b[1] &&
    a[2] === b[2] &&
    a[3] === b[3] &&
    Number(b[4]) > Number(a[4])
  );
}

function packageUrls(directory) {
  const output = path.join(directory, "project.spdx.json");
  command(
    "pnpm",
    ["sbom", "--lockfile-only", "--sbom-format", "spdx", "--out", output],
    { cwd: directory },
  );
  return JSON.parse(readFileSync(output, "utf8"))
    .packages.map((pkg) => {
      const purl = pkg.externalRefs?.find(
        (ref) => ref.referenceType === "purl",
      )?.referenceLocator;
      requireCondition(purl, "SBOM package is missing a package URL");
      return purl;
    })
    .sort();
}

function validateFiles(before, after) {
  const oldManifest = JSON.parse(before["package.json"]);
  const newManifest = JSON.parse(after["package.json"]);
  const changed = Object.keys({
    ...oldManifest.devDependencies,
    ...newManifest.devDependencies,
  }).filter(
    (name) =>
      oldManifest.devDependencies?.[name] !==
      newManifest.devDependencies?.[name],
  );
  requireCondition(
    changed.length === 1 && ALLOWLIST.includes(changed[0]),
    "Requires one allowlisted direct devDependency",
  );
  const name = changed[0];
  requireCondition(
    patchVersion(
      oldManifest.devDependencies[name],
      newManifest.devDependencies[name],
    ),
    "Only a stable patch with the same range prefix is eligible",
  );
  newManifest.devDependencies[name] = oldManifest.devDependencies[name];
  requireCondition(
    JSON.stringify(oldManifest) === JSON.stringify(newManifest),
    "Manifest contains additional changes",
  );
  const environment = (lock) => {
    const boundaries = [...lock.matchAll(/^---\s*$/gm)];
    requireCondition(
      boundaries.length === 2 && boundaries[0].index === 0,
      "Requires native pnpm dual-document lockfile",
    );
    return lock.slice(0, boundaries[1].index);
  };
  requireCondition(
    environment(before["pnpm-lock.yaml"]) ===
      environment(after["pnpm-lock.yaml"]),
    "Package-manager environment changed",
  );
  const sandbox = mkdtempSync(path.join(tmpdir(), "volleybro-dependency-"));
  try {
    for (const label of ["before", "after"]) {
      const directory = path.join(sandbox, label);
      mkdirSync(path.join(directory, "blueprint"), { recursive: true });
      for (const file of [
        "package.json",
        "blueprint/package.json",
        "pnpm-workspace.yaml",
      ])
        writeFileSync(
          path.join(directory, file),
          (label === "after" && file === "package.json" ? after : before)[file],
        );
      writeFileSync(
        path.join(directory, "pnpm-lock.yaml"),
        before["pnpm-lock.yaml"],
      );
      if (label === "after") {
        command(
          "pnpm",
          [
            "install",
            "--lockfile-only",
            "--ignore-scripts",
            "--ignore-pnpmfile",
          ],
          { cwd: directory, env: { ...process.env, HUSKY: "0", CI: "true" } },
        );
        requireCondition(
          readFileSync(path.join(directory, "pnpm-lock.yaml"), "utf8") ===
            after["pnpm-lock.yaml"],
          "Lockfile differs from native regeneration; manual review required",
        );
      }
    }
    const oldUrls = packageUrls(path.join(sandbox, "before"));
    const newUrls = packageUrls(path.join(sandbox, "after"));
    const prefix = `pkg:npm/${encodeURIComponent(name).replace(/%2F/g, "/")}@`;
    const oldPackage = oldUrls.filter((url) => url.startsWith(prefix));
    const newPackage = newUrls.filter((url) => url.startsWith(prefix));
    requireCondition(
      oldPackage.length === 1 &&
        newPackage.length === 1 &&
        patchVersion(
          oldPackage[0].slice(prefix.length),
          newPackage[0].slice(prefix.length),
        ),
      "Resolved package is not a single patch",
    );
    requireCondition(
      JSON.stringify(oldUrls.filter((url) => !url.startsWith(prefix))) ===
        JSON.stringify(newUrls.filter((url) => !url.startsWith(prefix))),
      "Transitive or other package changes require manual review",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
  return name;
}

async function inspect() {
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.DEPENDENCY_HEAD_SHA;
  requireCondition(
    /^[\w.-]+\/[\w.-]+$/.test(repository || "") &&
      /^[a-f0-9]{40}$/.test(sha || ""),
    "Missing repository or exact head SHA",
  );
  const api = (suffix) =>
    JSON.parse(command("gh", ["api", `repos/${repository}/${suffix}`]));
  const all = (suffix) =>
    JSON.parse(
      command("gh", [
        "api",
        `repos/${repository}/${suffix}`,
        "--paginate",
        "--slurp",
      ]),
    ).flat();
  const prs = api("pulls?state=open&base=main&per_page=100").filter(
    (pr) => pr.head.sha === sha,
  );
  if (!prs.length) return;
  requireCondition(prs.length === 1, "Ambiguous PR for this head");
  const pr = api(`pulls/${prs[0].number}`);
  requireCondition(
    pr.user?.id === BOT_ID &&
      pr.user?.login === "dependabot[bot]" &&
      pr.user?.type === "Bot" &&
      pr.head.repo?.full_name === repository &&
      pr.base.repo?.full_name === repository &&
      pr.base.ref === "main" &&
      pr.head.ref.startsWith("dependabot/") &&
      pr.head.sha === sha &&
      !pr.draft &&
      !pr.merged &&
      pr.state === "open",
    "Not a trusted active Dependabot PR",
  );
  const commits = all(`pulls/${pr.number}/commits?per_page=100`);
  requireCondition(
    commits.length === 1 &&
      commits[0].sha === sha &&
      commits[0].author?.id === BOT_ID &&
      commits[0].commit?.verification?.verified === true,
    "Only a signed single Dependabot commit is eligible",
  );
  const files = all(`pulls/${pr.number}/files?per_page=100`);
  requireCondition(
    files.length === 2 &&
      files.every(
        (file) =>
          ["package.json", "pnpm-lock.yaml"].includes(file.filename) &&
          file.status === "modified",
      ) &&
      files.reduce((sum, file) => sum + file.changes, 0) <= 80,
    "Expanded dependency diff requires manual review",
  );
  validateRequiredChecks(
    sha,
    all(`commits/${sha}/check-runs?per_page=100`).flatMap(
      (page) => page.check_runs || [],
    ),
    all(`commits/${sha}/statuses?per_page=100`),
  );
  const checks = JSON.parse(
    command("gh", [
      "pr",
      "checks",
      String(pr.number),
      "--repo",
      repository,
      "--required",
      "--json",
      "bucket",
    ]),
  );
  requireCondition(
    checks.length > 0 && checks.every((check) => check.bucket === "pass"),
    "Required checks have not all passed",
  );
  const view = JSON.parse(
    command("gh", [
      "pr",
      "view",
      String(pr.number),
      "--repo",
      repository,
      "--json",
      "mergeStateStatus,headRefOid",
    ]),
  );
  requireCondition(
    view.mergeStateStatus === "CLEAN" && view.headRefOid === sha,
    "PR is stale or blocked",
  );
  const content = (ref, file) =>
    Buffer.from(api(`contents/${file}?ref=${ref}`).content, "base64").toString(
      "utf8",
    );
  const before = Object.fromEntries(
    [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "blueprint/package.json",
    ].map((file) => [file, content(pr.base.sha, file)]),
  );
  const after = Object.fromEntries(
    ["package.json", "pnpm-lock.yaml"].map((file) => [
      file,
      content(sha, file),
    ]),
  );
  const name = validateFiles(before, after);
  requireCondition(
    api(`pulls/${pr.number}`).head.sha === sha,
    "PR head changed during inspection",
  );
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `number=${pr.number}\nsha=${sha}\n`,
  );
  process.stdout.write(`Eligible patch: ${name} at ${sha}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv[2] === "inspect") await inspect();
    else if (process.argv[2] === "validate-files") {
      const payload = JSON.parse(readFileSync(process.argv[3], "utf8"));
      process.stdout.write(`${validateFiles(payload.before, payload.after)}\n`);
    } else
      throw new Error(
        "Usage: dependency-controls.js inspect|validate-files <payload.json>",
      );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
