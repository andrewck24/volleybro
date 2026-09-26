#!/usr/bin/env node

import { access, lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fetchChanges,
  hashDir,
  readStore,
  REMOTE_REF,
  resolveRemote,
} from "./blueprint-changes.js";
import {
  assertValidMdx,
  frozenPart,
  git,
  hasReview,
  inlineReviewSections,
  isSinglePageDir,
  proposalPart,
  REQUIRED_REVIEW_SECTIONS,
  resolveScopeBase,
  resultIds,
  reviewSections,
  scenarioIds,
} from "./change-page.js";

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

const GUIDANCE_IMPORT = "@AGENTS.md";
const RETIRED_AUTHORITY_FILES = [
  "CONTRIBUTING.md",
  "CODING_STANDARDS.md",
  "AGENTS.md",
];
const SECTION_REFERENCE = /§\s?\d|\bsection\s*\d/i;
const PRE_PR_GATE_HEADING = /^###\s+.*Pre-PR gate.*$/m;
const NEXT_HEADING = /^#{2,3}\s/m;
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
const SCENARIO_COUNT_SOFT_LIMIT = 8;

async function validateGuidanceProse(root) {
  const diagnostics = [];
  for (const relativePath of RETIRED_AUTHORITY_FILES) {
    const filePath = path.join(root, relativePath);
    if (!(await exists(filePath))) continue;

    const content = await readFile(filePath, "utf8");
    if (/\bspectra\b/i.test(content)) {
      diagnostics.push(
        `${relativePath} [retired-authority]: active contributor guidance must not present Spectra as a delivery authority`,
      );
    }
  }

  return diagnostics;
}

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

// Matched by heading text, not position, so renumbering "### 3." doesn't
// break this. Renaming the "Pre-PR gate" heading itself still silently
// stops enforcing it.
function validatePrePrGateSection(content) {
  const match = content.match(PRE_PR_GATE_HEADING);
  if (!match) return [];

  const rest = content.slice(match.index + match[0].length);
  const nextHeading = rest.match(NEXT_HEADING);
  const section = nextHeading ? rest.slice(0, nextHeading.index) : rest;

  const diagnostics = [];
  if (!/CODING_STANDARDS\.md/.test(section)) {
    diagnostics.push(
      "WORKFLOW.md [standards-reviewer]: the Pre-PR gate section must mention CODING_STANDARDS.md",
    );
  }
  if (/CONTRIBUTING\.md/.test(section)) {
    diagnostics.push(
      "WORKFLOW.md [standards-reviewer]: the Pre-PR gate section must not mention CONTRIBUTING.md",
    );
  }
  return diagnostics;
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

async function isConverted(directory) {
  try {
    const facts = JSON.parse(
      await readFile(path.join(directory, "facts.json"), "utf8"),
    );
    return facts.converted === true;
  } catch {
    return false;
  }
}

async function changeDirectories(root) {
  const changesRoot = path.join(root, BLUEPRINT_CHANGES);
  if (!(await exists(changesRoot))) return [];

  // Pages converted from an earlier format (ADR-0079) never pass a gate and
  // predate every page rule below; their facts.json marks them.
  const entries = await readdir(changesRoot, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(changesRoot, entry.name));
  const current = [];
  for (const directory of directories) {
    if (!(await isConverted(directory))) current.push(directory);
  }
  return current;
}

// A page that is not valid MDX fails the gate with the parser's message;
// outside the gate it only fails the rules that need its structure.
function orUndefined(read) {
  try {
    return read();
  } catch {
    return undefined;
  }
}

const CHANGE_PAGE_MARKDOWN_TABLE = /^\s*\|.*\|\s*$/m;
const CHANGE_PAGE_RULES = [
  {
    file: "proposal.mdx",
    requires: (content) =>
      content.includes("<TLDR") && content.includes("<Scenario"),
    message: (slug) =>
      `${BLUEPRINT_CHANGES}/${slug}/proposal.mdx [blueprint-proposal]: must contain a TLDR and at least one Scenario`,
  },
  {
    file: "review.mdx",
    requires: (content) =>
      content.includes("<TLDR") && CHANGE_PAGE_MARKDOWN_TABLE.test(content),
    message: (slug) =>
      `${BLUEPRINT_CHANGES}/${slug}/review.mdx [blueprint-review]: must contain a TLDR and a markdown table`,
  },
  {
    file: "index.mdx",
    requires: (content) =>
      orUndefined(() => proposalPart(content).includes("<TLDR")) &&
      orUndefined(() => scenarioIds(content).length) > 0,
    message: (slug) =>
      `${BLUEPRINT_CHANGES}/${slug}/index.mdx [blueprint-proposal]: the Proposal tab must contain a TLDR and the page must export at least one scenario`,
  },
];

async function validateChangePages(directories) {
  const diagnostics = [];

  for (const directory of directories) {
    const slug = path.basename(directory);

    for (const rule of CHANGE_PAGE_RULES) {
      const filePath = path.join(directory, rule.file);
      if (!(await exists(filePath))) continue;

      const content = await readFile(filePath, "utf8");
      if (!rule.requires(content)) diagnostics.push(rule.message(slug));
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

async function validateSnippetLiterals(root, directories) {
  const diagnostics = [];
  for (const directory of directories) {
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

async function hasMigrationTrailer(root, base) {
  try {
    const trailers = await git(root, [
      "log",
      `${base}..HEAD`,
      "--format=%(trailers:key=Migration,valueonly)",
    ]);
    return trailers.length > 0;
  } catch {
    return false;
  }
}

// ADR-0065: soft target, never a hard failure -- a Migration
// Change (commit trailer or --migration) is the only escape hatch.
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
  if (options.migrationSlug) return [];
  if (await hasMigrationTrailer(root, base)) return [];

  return [
    `src [change-scope]: ${changedFiles.length} files changed against ${base} exceeds the soft target of ${CHANGE_SCOPE_SOFT_LIMIT}; reference a Migration Proposal slug (commit trailer "Migration: <slug>" or --migration <slug>) or split the Change`,
  ];
}

// Proposal scenarios are the other ADR-0065 soft target checked here,
// read straight off whatever Change directories exist locally, independent
// of the src/ file-count check above. Slice count is also a soft target
// (WORKFLOW.md's Change scope section), but slices are Linear sub-issues
// now, so it is a written target only and not checked here.
async function checkChangeSizeWarnings(root) {
  const diagnostics = [];

  for (const directory of await changeDirectories(root)) {
    const slug = path.basename(directory);

    for (const [file, count] of [
      [
        "proposal.mdx",
        (content) => (content.match(/<Scenario\b/g) ?? []).length,
      ],
      [
        "index.mdx",
        (content) => orUndefined(() => scenarioIds(content).length) ?? 0,
      ],
    ]) {
      const filePath = path.join(directory, file);
      if (!(await exists(filePath))) continue;
      const scenarioCount = count(await readFile(filePath, "utf8"));
      if (scenarioCount > SCENARIO_COUNT_SOFT_LIMIT) {
        diagnostics.push(
          `${BLUEPRINT_CHANGES}/${slug}/${file} [change-scope]: ${scenarioCount} acceptance scenarios exceeds the soft target of ${SCENARIO_COUNT_SOFT_LIMIT}; split the Change`,
        );
      }
    }
  }

  return diagnostics;
}

export async function checkChangeScope(root = process.cwd(), options = {}) {
  return [
    ...(await checkFileCountScope(root, options)),
    ...(await checkChangeSizeWarnings(root)),
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
    diagnostics.push(...validatePrePrGateSection(workflow));
  }

  diagnostics.push(...(await validateGuidanceImport(root)));

  const agentsPath = path.join(root, "AGENTS.md");
  if (!(await exists(agentsPath))) {
    diagnostics.push("AGENTS.md [workflow-bridge]: file is missing");
  } else {
    const content = await readFile(agentsPath, "utf8");
    diagnostics.push(...validateBridge("AGENTS.md", content));
    diagnostics.push(...validateSectionReferences("AGENTS.md", content));
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
  diagnostics.push(...(await validateChangePages(directories)));
  diagnostics.push(...(await validateSnippetLiterals(root, directories)));
  diagnostics.push(...(await validateSharedSkills(root)));
  diagnostics.push(...(await validateRetiredAuthorities(root)));
  diagnostics.push(...(await validateGuidanceProse(root)));

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

// A flag whose value is missing is a typo, not an absent flag: returning
// undefined there would skip the check the caller asked for.
function flagValue(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

// A gate stops for the developer on a page they read from the store branch, so
// an unpublished edit would show them something other than what the agent
// means them to accept. `publish` records the hash it pushed, so anything else
// on disk is unpublished.
export async function checkPublished(root, slug) {
  const changesDir = path.join(root, BLUEPRINT_CHANGES);
  const slugDir = path.join(changesDir, slug);
  if (!(await exists(slugDir))) {
    return `${BLUEPRINT_CHANGES}/${slug} [blueprint-gate]: no Change directory to publish`;
  }

  const published = (await readStore(changesDir))[slug];
  const current = await hashDir(slugDir);
  if (published === current) return undefined;

  return `${BLUEPRINT_CHANGES}/${slug} [blueprint-gate]: ${
    published ? "edited since it was published" : "never published"
  } — run \`pnpm blueprint:changes:publish ${slug}\` before the gate`;
}

const GATE_PAGE_SUFFIXES = {
  "proposal.mdx": "Proposal",
  "review.mdx": "Review",
};
const GATE_PAGE_NAMES = new Set(Object.values(GATE_PAGE_SUFFIXES));

function frontmatterTitle(content) {
  const titleMatch = content.match(/^title:\s*(.*)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const quoted = title.match(/^(["'])(.*)\1$/);
  return quoted ? quoted[2] : title;
}

export async function checkGateTitles(root, slug) {
  const diagnostics = [];
  const changeDir = path.join(root, BLUEPRINT_CHANGES, slug);

  for (const [file, suffix] of Object.entries(GATE_PAGE_SUFFIXES)) {
    const filePath = path.join(changeDir, file);
    if (!(await exists(filePath))) continue;

    const title = frontmatterTitle(await readFile(filePath, "utf8"));
    const nameMatch = title.match(new RegExp(`^(.+) — ${suffix}$`));
    const name = nameMatch ? nameMatch[1].trim() : "";

    if (!name || GATE_PAGE_NAMES.has(name)) {
      diagnostics.push(
        `${BLUEPRINT_CHANGES}/${slug}/${file} [gate-title]: title must be "<name> — ${suffix}" with a non-empty name`,
      );
    }
  }

  return diagnostics;
}

// ADR-0075: what G1 accepted is compared with the most recent G1
// publish on the store branch; no G1 publish there means nothing to compare.
async function g1Frozen(root, slug) {
  let shas;
  try {
    const output = await git(root, [
      "log",
      "--format=%H",
      REMOTE_REF,
      "--",
      `${slug}/facts.json`,
    ]);
    shas = output ? output.split("\n") : [];
  } catch {
    return undefined;
  }
  for (const sha of shas) {
    try {
      const facts = JSON.parse(
        await git(root, ["show", `${sha}:${slug}/facts.json`]),
      );
      if (facts.gate !== "G1") continue;
      return frozenPart(await git(root, ["show", `${sha}:${slug}/index.mdx`]));
    } catch {
      continue;
    }
  }
  return undefined;
}

async function refreshStore(root) {
  await fetchChanges(await resolveRemote(root), root);
}

export async function checkSinglePageGate(
  root,
  slug,
  { refresh = refreshStore } = {},
) {
  const changeDir = path.join(root, BLUEPRINT_CHANGES, slug);
  if (!(await exists(changeDir))) return [];
  if (!isSinglePageDir(await readdir(changeDir))) return [];
  const indexPath = path.join(changeDir, "index.mdx");

  const where = `${BLUEPRINT_CHANGES}/${slug}/index.mdx`;
  const content = await readFile(indexPath, "utf8");
  const diagnostics = [];

  const title = frontmatterTitle(content);
  if (!title || GATE_PAGE_NAMES.has(title)) {
    diagnostics.push(
      `${where} [gate-title]: title must be the Change's name, not empty or a tab name`,
    );
  }

  try {
    assertValidMdx(content);
  } catch (error) {
    diagnostics.push(
      `${where} [gate-mdx]: the page is not valid MDX — ${error.message.split("\n")[0]}`,
    );
    return diagnostics;
  }

  if (scenarioIds(content).some((id) => !id)) {
    diagnostics.push(
      `${where} [gate-scenario-shape]: every entry in scenarios needs an id`,
    );
  }

  if (!hasReview(content)) return diagnostics;

  const results = new Set(resultIds(content));
  for (const id of scenarioIds(content)) {
    if (!results.has(id)) {
      diagnostics.push(
        `${where} [gate-scenario-results]: scenario ${id} has no result in ScenarioResults`,
      );
    }
  }

  const sections = reviewSections(content);
  const missing = REQUIRED_REVIEW_SECTIONS.filter(
    (section) => !sections.includes(section),
  );
  if (missing.length > 0) {
    diagnostics.push(
      `${where} [gate-review-sections]: the Review tab is missing ${missing.join(", ")}`,
    );
  }
  const inline = inlineReviewSections(content);
  if (inline.length > 0) {
    diagnostics.push(
      `${where} [gate-review-sections]: write ${inline.join(", ")} with the opening and closing tags on their own lines`,
    );
  }

  try {
    await refresh(root);
  } catch (error) {
    diagnostics.push(
      `${where} [gate-proposal-frozen]: could not fetch the store branch to compare the Proposal with its G1 publish — ${error.message.split("\n")[0]}`,
    );
    return diagnostics;
  }
  const accepted = await g1Frozen(root, slug);
  if (
    accepted !== undefined &&
    accepted.trim() !== frozenPart(content).trim()
  ) {
    diagnostics.push(
      `${where} [gate-proposal-frozen]: the Proposal differs from the version published at G1; change it only by passing G1 again`,
    );
  }

  return diagnostics;
}

const GATE_BRANCH_STATE_ACTION =
  "commit and push the Change branch before publishing";

// The reason lives in WORKFLOW.md's G1 exit steps.
export async function checkGateBranchState(root) {
  const diagnostics = [];

  const status = await git(root, [
    "status",
    "--porcelain",
    "--",
    "blueprint/content/decisions",
  ]).catch(() => "");
  if (status) {
    diagnostics.push(
      `blueprint/content/decisions [gate-branch-state]: ${GATE_BRANCH_STATE_ACTION} — decision records have uncommitted or untracked changes`,
    );
  }

  try {
    await git(root, ["rev-parse", "--verify", "@{u}"]);
  } catch {
    diagnostics.push(
      `[gate-branch-state]: ${GATE_BRANCH_STATE_ACTION} — the current branch has no upstream`,
    );
    return diagnostics;
  }

  const ahead = await git(root, ["rev-list", "--count", "@{u}..HEAD"]);
  if (Number(ahead) > 0) {
    diagnostics.push(
      `[gate-branch-state]: ${GATE_BRANCH_STATE_ACTION} — the branch is ahead of its upstream`,
    );
  }

  return diagnostics;
}

const DECISION_LENGTH_SOFT_LIMIT = 1000;

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

// WORKFLOW's Pre-PR step 2 settles the Changeset before code review; a
// Changeset written after review reopens the review loop.
export async function checkChangesetAtG2(root, slug) {
  let content;
  try {
    content = await readFile(
      path.join(root, "blueprint/content/changes", slug, "index.mdx"),
      "utf8",
    );
  } catch {
    return [];
  }
  if (!hasReview(content)) return [];

  const base = await resolveScopeBase(root);
  let changed;
  try {
    changed = await git(root, [
      "diff",
      "--name-only",
      "--diff-filter=A",
      `${base}...HEAD`,
      "--",
      ".changeset",
    ]);
  } catch {
    return [];
  }
  const hasChangeset = changed
    .split("\n")
    .some((file) => file.endsWith(".md") && !file.endsWith("README.md"));
  return hasChangeset
    ? []
    : [
        `${slug} [changeset]: the branch has no Changeset at G2; write one before code review, or state in the Review tab why none applies`,
      ];
}

async function main() {
  const diagnostics = await checkWorkflow();
  const gateSlug = flagValue(process.argv.slice(2), "--gate");
  const warnings = await checkChangeScope(process.cwd(), {
    migrationSlug: flagValue(process.argv.slice(2), "--migration"),
  });
  if (gateSlug) {
    const unpublished = await checkPublished(process.cwd(), gateSlug);
    if (unpublished) diagnostics.push(unpublished);
    diagnostics.push(...(await checkGateTitles(process.cwd(), gateSlug)));
    diagnostics.push(...(await checkSinglePageGate(process.cwd(), gateSlug)));
    diagnostics.push(...(await checkGateBranchState(process.cwd())));
    warnings.push(...(await checkDecisionRecordLength(process.cwd())));
    warnings.push(...(await checkChangesetAtG2(process.cwd(), gateSlug)));
  }

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
