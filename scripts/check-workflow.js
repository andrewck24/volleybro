#!/usr/bin/env node

import { access, lstat, readFile, readdir, readlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REQUIRED_BINDINGS = {
  sdd: { adapter: "repository-workflow" },
  change_comprehension: { adapter: "blueprint" },
  release_planning: { adapter: "linear", mode: "milestone" },
  versioning: { adapter: "changesets" },
  workpad: { adapter: "linear-comment" },
  scm: { adapter: "github" },
  review: { adapter: "github-pr" },
  validation: { adapter: "repository-commands" },
  archive: { adapter: "repository-workflow" },
  evaluation: { adapter: "symphony", text_retention: "ephemeral" },
};

const SUPPORTED_ADAPTERS = {
  sdd: new Set([
    "repository-workflow",
    "spectra",
    "openspec",
    "spec-kit",
    "off",
  ]),
  change_comprehension: new Set(["blueprint", "markdown", "off"]),
  release_planning: new Set(["linear", "github", "jira", "off"]),
  versioning: new Set(["changesets", "semantic-release", "manual", "off"]),
  workpad: new Set(["linear-comment", "repository-file", "off"]),
  scm: new Set(["github", "gitlab", "local"]),
  review: new Set(["github-pr", "gitlab-mr", "manual"]),
  validation: new Set(["repository-commands"]),
  archive: new Set([
    "repository-workflow",
    "spectra",
    "openspec",
    "manual",
    "off",
  ]),
  evaluation: new Set(["symphony", "off"]),
};

const BRIDGE_FILES = ["CLAUDE.md", "AGENTS.md"];
const REPOSITORY_ADAPTER_FILES = [
  "docs/agents/issue-tracker.md",
  "docs/agents/domain.md",
  "docs/agents/blueprint.md",
  "docs/agents/artifact-lifecycle.md",
];
const RETIRED_REFERENCE = ["spec", "loop"].join("-");
const ACTIVE_ROOT_FILES = ["CLAUDE.md", "AGENTS.md", "package.json"];
const ACTIVE_DIRECTORIES = [".github", "scripts"];
const RETIRED_WORKFLOW_PATTERN = /^spectra-.*\.md$/;
const BLUEPRINT_CHANGES = "blueprint/content/changes";
const BLUEPRINT_LINK_SOURCES = ["blueprint/src", "blueprint/content"];
const BLUEPRINT_LINK_EXTENSIONS = new Set([".tsx", ".mdx"]);
const ANCHOR_TAG = /<a(\s[^>]*)>/g;
const EXTERNAL_HREF = /href=["'](?:#|https?:|mailto:|tel:)/;
const CHANGE_SCOPE_SOFT_LIMIT = 30;
const MIGRATION_TRAILER = /^Migration:\s*(\S+)/im;

async function validateContributorGuidance(root) {
  const contributorPath = path.join(root, "CONTRIBUTING.md");
  if (!(await exists(contributorPath))) return [];

  const content = await readFile(contributorPath, "utf8");
  if (/\bspectra\b/i.test(content)) {
    return [
      "CONTRIBUTING.md [retired-authority]: active contributor guidance must not present Spectra as a delivery authority",
    ];
  }

  return [];
}

async function validateRetiredAuthorities(root) {
  const diagnostics = [];
  const workflowDirectory = path.join(root, ".agents", "workflows");
  if (await exists(workflowDirectory)) {
    const entries = await readdir(workflowDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && RETIRED_WORKFLOW_PATTERN.test(entry.name)) {
        diagnostics.push(
          `.agents/workflows/${entry.name} [retired-workflow]: executable Spectra workflows must not be tracked`,
        );
      }
    }
  }

  const changesDirectory = path.join(root, "docs", "changes");
  if (await exists(changesDirectory)) {
    const entries = await readdir(changesDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "archive") continue;
      const marker = path.join(changesDirectory, entry.name, ".openspec.yaml");
      if (await exists(marker)) {
        diagnostics.push(
          `docs/changes/${entry.name}/.openspec.yaml [active-legacy-change]: move the legacy change to a dated archive snapshot`,
        );
      }
    }
  }

  return diagnostics;
}

async function validateSharedSkills(root) {
  const diagnostics = [];
  const ignorePath = path.join(root, ".gitignore");

  if (await exists(ignorePath)) {
    const ignored = await readFile(ignorePath, "utf8");
    if (/^\/?\.agents\/$/m.test(ignored)) {
      diagnostics.push(
        ".gitignore [shared-skills]: .agents/ must be eligible for Git tracking",
      );
    }
  }

  const lockPath = path.join(root, "skills-lock.json");
  if (!(await exists(lockPath))) {
    diagnostics.push("skills-lock.json [shared-skills]: file is missing");
    return diagnostics;
  }

  let skillNames;
  try {
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    skillNames = Object.keys(lock.skills ?? {});
  } catch (error) {
    diagnostics.push(
      `skills-lock.json [shared-skills]: invalid JSON: ${error.message}`,
    );
    return diagnostics;
  }

  for (const skillName of skillNames) {
    const target = path.join(root, ".agents", "skills", skillName, "SKILL.md");
    if (!(await exists(target))) {
      diagnostics.push(
        `.agents/skills/${skillName}/SKILL.md [shared-skills]: installed skill target is missing`,
      );
    }

    const bridge = path.join(root, ".claude", "skills", skillName);
    if (!(await exists(bridge))) {
      diagnostics.push(
        `.claude/skills/${skillName} [shared-skills]: provider skill bridge is missing or broken`,
      );
      continue;
    }

    const stats = await lstat(bridge);
    if (!stats.isSymbolicLink()) {
      diagnostics.push(
        `.claude/skills/${skillName} [shared-skills]: provider skill bridge must be a symlink`,
      );
      continue;
    }

    const resolved = path.resolve(path.dirname(bridge), await readlink(bridge));
    const expected = path.join(root, ".agents", "skills", skillName);
    if (resolved !== expected) {
      diagnostics.push(
        `.claude/skills/${skillName} [shared-skills]: symlink must target .agents/skills/${skillName}`,
      );
    }
  }

  return diagnostics;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseDeliveryProfile(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") throw new Error("front matter must begin on line 1");

  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1)
    throw new Error("front matter closing delimiter is missing");

  const frontMatter = lines.slice(1, closingIndex);
  const versionLine = frontMatter.find((line) =>
    /^\s{2}version:\s*/.test(line),
  );
  if (!versionLine) throw new Error("delivery.version is missing");

  const version = Number(versionLine.split(":", 2)[1].trim());
  const capabilities = {};
  let inCapabilities = false;
  let currentCapability;

  for (const line of frontMatter) {
    if (/^\s{2}capabilities:\s*$/.test(line)) {
      inCapabilities = true;
      continue;
    }

    if (!inCapabilities || /^\s*$/.test(line)) continue;

    const capabilityMatch = line.match(/^\s{4}([a-z_]+):\s*$/);
    if (capabilityMatch) {
      currentCapability = capabilityMatch[1];
      capabilities[currentCapability] = {};
      continue;
    }

    const fieldMatch = line.match(/^\s{6}([a-z_]+):\s*([^#]+?)\s*$/);
    if (fieldMatch && currentCapability) {
      const [, key, rawValue] = fieldMatch;
      capabilities[currentCapability][key] = rawValue.replace(
        /^['"]|['"]$/g,
        "",
      );
      continue;
    }

    if (/^\s{0,2}\S/.test(line)) inCapabilities = false;
  }

  return { version, capabilities, frontMatter: frontMatter.join("\n") };
}

function validateProfile(profile) {
  const diagnostics = [];

  if (profile.version !== 1) {
    diagnostics.push(
      `WORKFLOW.md [delivery-profile]: delivery.version must be 1; received ${profile.version || "missing"}`,
    );
  }

  for (const [capability, required] of Object.entries(REQUIRED_BINDINGS)) {
    const configured = profile.capabilities[capability];
    if (!configured) {
      diagnostics.push(
        `WORKFLOW.md [delivery-profile]: capability ${capability} is missing`,
      );
      continue;
    }

    const supported = SUPPORTED_ADAPTERS[capability];
    if (!supported.has(configured.adapter)) {
      diagnostics.push(
        `WORKFLOW.md [delivery-profile]: ${capability} adapter ${configured.adapter || "missing"} is unsupported; supported: ${[...supported].join(", ")}`,
      );
      continue;
    }

    for (const [field, expected] of Object.entries(required)) {
      if (configured[field] !== expected) {
        diagnostics.push(
          `WORKFLOW.md [volleybro-binding]: ${capability}.${field} must be ${expected}; received ${configured[field] || "missing"}`,
        );
      }
    }
  }

  const durableTextField = profile.frontMatter.match(
    /^\s*(prompt|response|reasoning|transcript)(?:_[a-z_]+)?\s*:/im,
  );
  if (durableTextField) {
    diagnostics.push(
      `WORKFLOW.md [ephemeral_text]: durable provider-text field ${durableTextField[1]} is forbidden`,
    );
  }

  return diagnostics;
}

function validateBridge(relativePath, content) {
  const diagnostics = [];
  if (!/WORKFLOW\.md/.test(content)) {
    diagnostics.push(
      `${relativePath} [workflow-bridge]: must point to WORKFLOW.md`,
    );
  }

  if (
    /^#{2,}\s+(?:software delivery )?lifecycle\b/im.test(content) ||
    /^#{2,}\s+(?:discuss(?: and propose)?|apply(?: and ingest)?|review(?: and fix)?|archive)\s*$/im.test(
      content,
    )
  ) {
    diagnostics.push(
      `${relativePath} [workflow-bridge]: duplicated lifecycle content must move to WORKFLOW.md`,
    );
  }

  return diagnostics;
}

async function listFiles(directory) {
  if (!(await exists(directory))) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

async function activeReferenceFiles(root) {
  const rootFiles = ACTIVE_ROOT_FILES.map((relativePath) =>
    path.join(root, relativePath),
  );
  const directoryFiles = (
    await Promise.all(
      ACTIVE_DIRECTORIES.map((relativePath) =>
        listFiles(path.join(root, relativePath)),
      ),
    )
  ).flat();

  return [...rootFiles, ...directoryFiles].filter((filePath) => {
    const basename = path.basename(filePath);
    return basename !== "check-workflow.js" && !basename.includes(".test.");
  });
}

// A raw anchor is a full document load, which discards the sidebar state
// fumadocs keeps in React state. Internal links have to route through next/link.
async function validateInternalLinks(root) {
  const files = (
    await Promise.all(
      BLUEPRINT_LINK_SOURCES.map((relativePath) =>
        listFiles(path.join(root, relativePath)),
      ),
    )
  )
    .flat()
    .filter((filePath) =>
      BLUEPRINT_LINK_EXTENSIONS.has(path.extname(filePath)),
    );

  const diagnostics = [];
  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const [, attributes] of content.matchAll(ANCHOR_TAG)) {
      if (!attributes.includes("href=")) continue;
      if (EXTERNAL_HREF.test(attributes)) continue;
      diagnostics.push(
        `${path.relative(root, filePath)} [blueprint-internal-link]: use next/link so navigation keeps the sidebar state`,
      );
      break;
    }
  }

  return diagnostics;
}

// A Change directory that exists locally is always current work in
// progress -- there is no lifecycle field left to read, and an archived
// Change is not tracked, let alone present on disk.
async function changeDirectories(root) {
  const changesRoot = path.join(root, BLUEPRINT_CHANGES);
  if (!(await exists(changesRoot))) return [];

  const entries = await readdir(changesRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(changesRoot, entry.name));
}

// The two-gate model's whole content contract: a Proposal makes its case with
// a TLDR and at least one acceptance Scenario, a Delivery reports results with
// a TLDR and a table. Everything else about a Change page is free-form prose.
async function validateChangePages(root, directories) {
  const diagnostics = [];
  const markdownTable = /^\s*\|.*\|\s*$/m;

  for (const directory of directories) {
    const slug = path.basename(directory);

    const proposalPath = path.join(directory, "proposal.mdx");
    if (await exists(proposalPath)) {
      const content = await readFile(proposalPath, "utf8");
      if (!content.includes("<TLDR") || !content.includes("<Scenario")) {
        diagnostics.push(
          `${BLUEPRINT_CHANGES}/${slug}/proposal.mdx [blueprint-proposal]: must contain a TLDR and at least one Scenario`,
        );
      }
    }

    const deliveryPath = path.join(directory, "delivery.mdx");
    if (await exists(deliveryPath)) {
      const content = await readFile(deliveryPath, "utf8");
      if (!content.includes("<TLDR") || !markdownTable.test(content)) {
        diagnostics.push(
          `${BLUEPRINT_CHANGES}/${slug}/delivery.mdx [blueprint-delivery]: must contain a TLDR and a markdown table`,
        );
      }
    }
  }

  return diagnostics;
}

// Two ways a snippet prop loses its shape. MDX strips the leading whitespace
// from every continuation line of a multi-line template literal, so the code
// renders flush left; and a bare JSX string attribute is a literal, so its
// escapes render as the characters "\\n". An escaped string inside braces is
// the only form that survives.
const SNIPPET_FORMS = [
  [/=\{`[^`]*\n/, "a multi-line template literal"],
  [/\n\s*code="/, "a bare string attribute"],
];

async function validateSnippetLiterals(root, changeDirectories) {
  const diagnostics = [];
  for (const directory of changeDirectories) {
    for (const filePath of await listFiles(directory)) {
      if (!filePath.endsWith(".mdx")) continue;
      const content = await readFile(filePath, "utf8");
      for (const [form, label] of SNIPPET_FORMS) {
        if (!form.test(content)) continue;
        diagnostics.push(
          `${path.relative(root, filePath)} [blueprint-snippet]: a snippet prop is ${label}, not an escaped string in braces`,
        );
      }
    }
  }

  return diagnostics;
}

async function git(root, args) {
  return (await execFileAsync("git", args, { cwd: root })).stdout.trim();
}

async function resolveScopeBase(root) {
  try {
    await git(root, ["rev-parse", "--verify", "origin/dev"]);
    return "origin/dev";
  } catch {
    return "dev";
  }
}

// D4: a soft file-count target on src/, not a hard cap. A migration -- named
// either by a commit trailer or the --migration flag -- is the escape hatch
// for a change too large to shard any other way; everything else is expected
// to split into more than one Change.
export async function checkChangeScope(root = process.cwd(), options = {}) {
  const base = await resolveScopeBase(root);

  let changedFiles;
  try {
    const output = await git(root, [
      "diff",
      "--name-only",
      `${base}...HEAD`,
      "--",
      "src",
    ]);
    changedFiles = output ? output.split("\n") : [];
  } catch {
    return [];
  }

  if (changedFiles.length <= CHANGE_SCOPE_SOFT_LIMIT) return [];
  if (options.migrationSlug) return [];

  let log = "";
  try {
    log = await git(root, ["log", `${base}..HEAD`, "--format=%B"]);
  } catch {
    log = "";
  }
  if (MIGRATION_TRAILER.test(log)) return [];

  return [
    `src [change-scope]: ${changedFiles.length} files changed against ${base} exceeds the soft target of ${CHANGE_SCOPE_SOFT_LIMIT}; reference a Migration Proposal slug (commit trailer "Migration: <slug>" or --migration <slug>) or split the Change`,
  ];
}

export async function checkWorkflow(root = process.cwd()) {
  const diagnostics = [];
  const workflowPath = path.join(root, "WORKFLOW.md");

  if (!(await exists(workflowPath))) {
    diagnostics.push("WORKFLOW.md [canonical-contract]: file is missing");
  } else {
    const workflow = await readFile(workflowPath, "utf8");
    try {
      diagnostics.push(...validateProfile(parseDeliveryProfile(workflow)));
    } catch (error) {
      diagnostics.push(`WORKFLOW.md [delivery-profile]: ${error.message}`);
    }
  }

  for (const relativePath of BRIDGE_FILES) {
    const filePath = path.join(root, relativePath);
    if (!(await exists(filePath))) {
      diagnostics.push(`${relativePath} [workflow-bridge]: file is missing`);
      continue;
    }
    diagnostics.push(
      ...validateBridge(relativePath, await readFile(filePath, "utf8")),
    );
  }

  for (const relativePath of REPOSITORY_ADAPTER_FILES) {
    if (!(await exists(path.join(root, relativePath)))) {
      diagnostics.push(
        `${relativePath} [repository-adapter]: required adapter file is missing`,
      );
    }
  }

  diagnostics.push(...(await validateInternalLinks(root)));
  const directories = await changeDirectories(root);
  diagnostics.push(...(await validateChangePages(root, directories)));
  diagnostics.push(...(await validateSnippetLiterals(root, directories)));
  diagnostics.push(...(await validateSharedSkills(root)));
  diagnostics.push(...(await validateRetiredAuthorities(root)));
  diagnostics.push(...(await validateContributorGuidance(root)));

  for (const filePath of await activeReferenceFiles(root)) {
    if (!(await exists(filePath))) continue;
    const content = await readFile(filePath, "utf8");
    if (content.toLowerCase().includes(RETIRED_REFERENCE)) {
      diagnostics.push(
        `${path.relative(root, filePath)} [retired-reference]: remove the active retired harness reference`,
      );
    }
  }

  return diagnostics.sort();
}

function parseMigrationFlag(argv) {
  const index = argv.indexOf("--migration");
  return index === -1 ? undefined : argv[index + 1];
}

async function main() {
  const diagnostics = await checkWorkflow();
  const warnings = await checkChangeScope(process.cwd(), {
    migrationSlug: parseMigrationFlag(process.argv.slice(2)),
  });

  for (const warning of warnings) console.warn(`Warning: ${warning}`);

  if (diagnostics.length === 0) {
    console.log("Workflow conformance passed.");
    return;
  }

  console.error("Workflow conformance failed:\n");
  for (const diagnostic of diagnostics) console.error(`- ${diagnostic}`);
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
