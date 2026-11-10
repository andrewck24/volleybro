#!/usr/bin/env node

import { lstat, readFile, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { parse } from "yaml";

import { git, resolveScopeBase } from "./git-scope.js";

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

const GUIDANCE_IMPORT = "@AGENTS.md";
const SECTION_REFERENCE = /§\s?\d|\bsection\s*\d/i;
const REQUIRED_FILES = [
  "WORKFLOW.md",
  "docs/agents/issue-tracker.md",
  "docs/agents/domain.md",
  "docs/agents/blueprint.md",
  "docs/agents/artifact-lifecycle.md",
  "docs/agents/skill-adapters.md",
];
const FEATURE_CONTENT = "blueprint/content/features";
const CHANGE_SCOPE_SOFT_LIMIT = 30;
const DECISION_LENGTH_SOFT_LIMIT = 1000;

async function validateGuidanceImport(root) {
  const filePath = path.join(root, "CLAUDE.md");
  if (!(await exists(filePath))) {
    return ["CLAUDE.md [guidance-import]: file is missing"];
  }

  const content = await readFile(filePath, "utf8");
  if (content !== GUIDANCE_IMPORT && content !== `${GUIDANCE_IMPORT}\n`) {
    return [
      `CLAUDE.md [guidance-import]: must contain exactly "${GUIDANCE_IMPORT}"`,
    ];
  }

  return [];
}

function validateSectionReferences(relativePath, content) {
  if (!SECTION_REFERENCE.test(content)) return [];
  return [
    `${relativePath} [section-reference]: must not reference a section number; state the rule instead of citing its position`,
  ];
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

const SKILL_ADAPTERS = "docs/agents/skill-adapters.md";
const SKILL_ADAPTER_ROW = /^\|\s*`([^`]+)`\s*\|(.*)\|\s*$/;
const BACKTICKED = /`([^`]+)`/g;
const NO_ADAPTER = "no adapter";

async function validateSkillAdapters(root, agentsContent) {
  const lockPath = path.join(root, "skills-lock.json");
  let locked = [];
  try {
    locked = Object.keys(
      JSON.parse(await readFile(lockPath, "utf8")).skills ?? {},
    );
  } catch {
    // validateSharedSkills reports a missing or invalid lock.
  }
  const skillsDirectory = path.join(root, ".agents", "skills");
  const installed = (await exists(skillsDirectory))
    ? (await readdir(skillsDirectory, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];
  const skills = new Set([...locked, ...installed]);

  const diagnostics = [];
  if (!agentsContent.includes(SKILL_ADAPTERS)) {
    diagnostics.push(
      `AGENTS.md [skill-adapter]: must point to ${SKILL_ADAPTERS}, so every agent finds a skill's adapters`,
    );
  }
  const tablePath = path.join(root, SKILL_ADAPTERS);
  // A missing map is reported once, as a required file.
  if (!(await exists(tablePath))) return diagnostics;
  const table = await readFile(tablePath, "utf8");
  const rows = new Map();
  for (const line of table.split(/\r?\n/)) {
    const match = line.match(SKILL_ADAPTER_ROW);
    if (match) rows.set(match[1], match[2].trim());
  }

  for (const skill of skills) {
    if (!rows.has(skill)) {
      diagnostics.push(
        `${SKILL_ADAPTERS} [skill-adapter]: ${skill} has no row; name its adapters or write "${NO_ADAPTER}"`,
      );
    }
  }
  for (const [skill, cell] of rows) {
    if (!skills.has(skill)) {
      diagnostics.push(
        `${SKILL_ADAPTERS} [skill-adapter]: row ${skill} names no installed skill`,
      );
    }
    if (cell === NO_ADAPTER) continue;
    const adapters = [...cell.matchAll(BACKTICKED)].map(
      ([, adapter]) => adapter,
    );
    if (adapters.length === 0) {
      diagnostics.push(
        `${SKILL_ADAPTERS} [skill-adapter]: row ${skill} must list adapter paths in backticks or say "${NO_ADAPTER}"`,
      );
    }
    for (const adapter of adapters) {
      if (!(await exists(path.join(root, adapter)))) {
        diagnostics.push(
          `${SKILL_ADAPTERS} [skill-adapter]: ${skill} names ${adapter}, which does not exist`,
        );
      }
    }
  }
  return diagnostics;
}

async function exists(filePath) {
  // stat, not access: on Windows access succeeds on a dangling symlink.
  try {
    await stat(filePath);
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

  const document = parse(lines.slice(1, closingIndex).join("\n"));
  const delivery = document?.delivery;
  if (delivery?.version === undefined)
    throw new Error("delivery.version is missing");

  return {
    version: delivery.version,
    capabilities: delivery.capabilities ?? {},
    document,
  };
}

function findDurableTextKey(node) {
  if (node === null || typeof node !== "object") return undefined;
  for (const [key, value] of Object.entries(node)) {
    if (/^(prompt|response|reasoning|transcript)(?:_[a-z_]+)?$/i.test(key))
      return key;
    const nested = findDurableTextKey(value);
    if (nested) return nested;
  }
  return undefined;
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

    for (const [field, expected] of Object.entries(required)) {
      if (configured[field] !== expected) {
        diagnostics.push(
          `WORKFLOW.md [volleybro-binding]: ${capability}.${field} must be ${expected}; received ${configured[field] || "missing"}`,
        );
      }
    }
  }

  const durableTextField = findDurableTextKey(profile.document);
  if (durableTextField) {
    diagnostics.push(
      `WORKFLOW.md [ephemeral_text]: durable provider-text field ${durableTextField} is forbidden`,
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

const SNIPPET_FORMS = [
  [/=\{`[^`]*\n/, "a multi-line template literal"],
  [/\n\s*code="/, "a bare string attribute"],
];
const SVG_TEXT_OPEN_ON_OWN_LINE = /<text\b[^>]*>[ \t]*\r?\n/;

function withoutFencedCode(content) {
  let fence;
  return content
    .split(/\r?\n/)
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
      if (!fence && marker) {
        fence = { character: marker[0], length: marker.length };
        return "";
      }
      if (fence) {
        const closing = new RegExp(
          `^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`,
          "u",
        );
        if (closing.test(line)) fence = undefined;
        return "";
      }
      return line;
    })
    .join("\n");
}

async function validateMdxSource(root) {
  const diagnostics = [];
  const directory = path.join(root, FEATURE_CONTENT);
  for (const filePath of await listFiles(directory)) {
    if (!filePath.endsWith(".mdx")) continue;
    const content = await readFile(filePath, "utf8");
    for (const [form, label] of SNIPPET_FORMS) {
      if (!form.test(content)) continue;
      diagnostics.push(
        `${path.relative(root, filePath)} [blueprint-snippet]: a snippet prop is ${label}, not an escaped string in braces`,
      );
    }
    if (SVG_TEXT_OPEN_ON_OWN_LINE.test(withoutFencedCode(content))) {
      diagnostics.push(
        `${path.relative(root, filePath)} [blueprint-svg-text]: an SVG <text> opening tag must be followed by content on the same line`,
      );
    }
  }

  return diagnostics;
}

async function hasShardTrailer(root, base) {
  try {
    const trailers = await git(root, [
      "log",
      `${base}..HEAD`,
      "--format=%(trailers:key=Shard,valueonly)",
    ]);
    return trailers.length > 0;
  } catch {
    return false;
  }
}

async function checkFileCountScope(root, options) {
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
  if (options.changeShardsSlug) return [];
  if (await hasShardTrailer(root, base)) return [];

  return [
    `src [change-scope]: ${changedFiles.length} files changed against ${base} exceeds the soft target of ${CHANGE_SCOPE_SOFT_LIMIT}; split the Change into shards (branch <prefix>/<slug>-s<N>, commits carrying "Shard: <N>", or --change-shards <slug>), or upgrade to a Mapped Change if it needs a wayfinder map`,
  ];
}

export async function checkChangeScope(root = process.cwd(), options = {}) {
  return checkFileCountScope(root, options);
}

const TEST_TIER_SUFFIX = /\.(test|spec|itest|e2e)\.[cm]?[jt]sx?$/;
const TEST_TIER_HOMES = {
  itest: {
    pattern: /^test\/integration\/(api|persistence)\//,
    name: "under test/integration/api/ or test/integration/persistence/",
  },
  e2e: { pattern: /^test\/e2e\//, name: "under test/e2e/" },
};

async function validateTestTiers(root) {
  const files = (
    await Promise.all(
      ["src", "test"].map((dir) => listFiles(path.join(root, dir))),
    )
  )
    .flat()
    .map((filePath) => path.relative(root, filePath).split(path.sep).join("/"));

  const diagnostics = [];
  for (const relativePath of files) {
    const suffix = relativePath.match(TEST_TIER_SUFFIX)?.[1];
    if (!suffix) continue;
    if (suffix === "spec") {
      diagnostics.push(
        `${relativePath} [test-tier]: name a unit test .test, not .spec`,
      );
      continue;
    }
    const home = TEST_TIER_HOMES[suffix];
    const misplaced = home
      ? !home.pattern.test(relativePath)
      : relativePath.startsWith("test/");
    if (misplaced) {
      diagnostics.push(
        `${relativePath} [test-tier]: a .${suffix} file belongs ${home?.name ?? "beside its code in src/"}`,
      );
    }
  }
  return diagnostics;
}

export async function checkWorkflow(root = process.cwd()) {
  const diagnostics = [];
  for (const relativePath of REQUIRED_FILES) {
    if (!(await exists(path.join(root, relativePath)))) {
      diagnostics.push(`${relativePath} [required-file]: file is missing`);
    }
  }

  const workflowPath = path.join(root, "WORKFLOW.md");
  if (await exists(workflowPath)) {
    const workflow = await readFile(workflowPath, "utf8");
    try {
      diagnostics.push(...validateProfile(parseDeliveryProfile(workflow)));
    } catch (error) {
      diagnostics.push(`WORKFLOW.md [delivery-profile]: ${error.message}`);
    }
  }

  diagnostics.push(...(await validateGuidanceImport(root)));

  const agentsPath = path.join(root, "AGENTS.md");
  if (!(await exists(agentsPath))) {
    diagnostics.push("AGENTS.md [workflow-bridge]: file is missing");
  } else {
    const content = await readFile(agentsPath, "utf8");
    diagnostics.push(...validateBridge("AGENTS.md", content));
    diagnostics.push(...validateSectionReferences("AGENTS.md", content));
    diagnostics.push(...(await validateSkillAdapters(root, content)));
  }

  diagnostics.push(...(await validateTestTiers(root)));
  diagnostics.push(...(await validateMdxSource(root)));
  diagnostics.push(...(await validateSharedSkills(root)));

  return diagnostics.sort();
}

function flagValue(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

export async function checkDecisionRecordLength(root) {
  const base = await resolveScopeBase(root);

  let added;
  try {
    const output = await git(root, [
      "diff",
      "--name-only",
      "--diff-filter=A",
      `${base}...HEAD`,
      "--",
      "blueprint/content/decisions",
    ]);
    added = output ? output.split("\n") : [];
  } catch {
    return [];
  }

  const diagnostics = [];
  for (const relativePath of added) {
    let record;
    try {
      record = JSON.parse(
        await readFile(path.join(root, relativePath), "utf8"),
      );
    } catch {
      continue;
    }

    const length = record.decision?.length ?? 0;
    if (length > DECISION_LENGTH_SOFT_LIMIT) {
      diagnostics.push(
        `${relativePath} [decision-length]: decision is ${length} characters, past the soft target of ${DECISION_LENGTH_SOFT_LIMIT}; split the record or move detail into context or consequences`,
      );
    }
  }

  return diagnostics;
}

const DECISIONS_DIR = "blueprint/content/decisions";
const AMEND_TRAILER = "Decision-Amend";

// An adopted decision is replaced, never rewritten: against the merge-base only
// `supersededBy` may change on a record that already exists. A
// `Decision-Amend: <id>` trailer on a branch commit records the developer's
// approval of one record.
export async function checkDecisionImmutability(root) {
  const base = await resolveScopeBase(root);

  let mergeBase;
  let changes;
  let amended;
  try {
    mergeBase = await git(root, ["merge-base", base, "HEAD"]);
    changes = (
      await git(root, [
        "diff",
        "--name-status",
        "--no-renames",
        mergeBase,
        "HEAD",
        "--",
        DECISIONS_DIR,
      ])
    )
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("\t"))
      .filter(([status]) => status !== "A");
    amended = new Set(
      (
        await git(root, [
          "log",
          `${mergeBase}..HEAD`,
          `--format=%(trailers:key=${AMEND_TRAILER},valueonly)`,
        ])
      )
        .split("\n")
        .map((value) => value.trim().replace(/^ADR-/i, ""))
        .filter(Boolean),
    );
  } catch {
    return [];
  }

  const diagnostics = [];
  for (const [status, relativePath] of changes) {
    const id = path.basename(relativePath).match(/^(\d+)-/)?.[1];
    if (id && amended.has(id)) continue;

    const approval = `or add a "${AMEND_TRAILER}: ${id ?? "<id>"}" trailer the developer approved`;
    if (status === "D") {
      diagnostics.push(
        `${relativePath} [decision-immutable]: an adopted decision is not deleted; set supersededBy on it (${approval})`,
      );
      continue;
    }

    let unchanged = false;
    try {
      const before = JSON.parse(
        await git(root, ["show", `${mergeBase}:${relativePath}`]),
      );
      const after = JSON.parse(
        await git(root, ["show", `HEAD:${relativePath}`]),
      );
      delete before.supersededBy;
      delete after.supersededBy;
      unchanged = isDeepStrictEqual(before, after);
    } catch {
      // A record that does not parse cannot be shown unchanged.
    }
    if (!unchanged) {
      diagnostics.push(
        `${relativePath} [decision-immutable]: an adopted decision may change only supersededBy; record a new decision and supersede this one (${approval})`,
      );
    }
  }

  return diagnostics;
}

async function main() {
  const argv = process.argv.slice(2);
  const diagnostics = [
    ...(await checkWorkflow()),
    ...(await checkDecisionImmutability(process.cwd())),
  ];
  const warnings = [
    ...(await checkChangeScope(process.cwd(), {
      changeShardsSlug: flagValue(argv, "--change-shards"),
    })),
    ...(await checkDecisionRecordLength(process.cwd())),
  ];

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
