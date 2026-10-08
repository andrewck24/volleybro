#!/usr/bin/env node

import { lstat, readFile, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fetchChanges,
  hashDir,
  isConverted,
  readStore,
  REMOTE_REF,
  resolveRemote,
} from "./blueprint-changes.js";
import {
  assertValidMdx,
  frontmatterOf,
  git,
  inlineReviewSections,
  readChangeDir,
  REQUIRED_REVIEW_SECTIONS,
  resolveScopeBase,
  resultIds,
  reviewFile,
  reviewSections,
  scenarioIds,
  scenarios,
  shardCount,
} from "./change-page.js";
import { changeSlugOf, parseChangeBranch } from "./commitlint/plugin.js";

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
];
const BLUEPRINT_CHANGES = "blueprint/content/changes";
const BLUEPRINT_LINK_SOURCES = ["blueprint/src", "blueprint/content"];
const BLUEPRINT_LINK_EXTENSIONS = new Set([".tsx", ".mdx"]);
const ANCHOR_TAG = /<a(\s[^>]*)>/g;
const EXTERNAL_HREF = /href=["'](?:#|https?:|mailto:|tel:)/;
const CHANGE_SCOPE_SOFT_LIMIT = 30;
const SCENARIO_COUNT_SOFT_LIMIT = 8;

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

async function changeDirectories(root) {
  const changesRoot = path.join(root, BLUEPRINT_CHANGES);
  if (!(await exists(changesRoot))) return [];

  // Pages converted from an earlier format (ADR-0079) never pass a gate and
  // predate every page rule below; their facts.json marks them, and
  // republishing one keeps the mark.
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

function scenarioCount(proposal) {
  return orUndefined(() => scenarioIds(proposal ?? "").length) ?? 0;
}

async function validateChangePages(directories) {
  const diagnostics = [];

  for (const directory of directories) {
    const page = await readChangeDir(directory);
    if (page.index === undefined) continue;

    const isComplete =
      page.proposal?.includes("<TLDR") && scenarioCount(page.proposal) > 0;
    if (!isComplete) {
      diagnostics.push(
        `${BLUEPRINT_CHANGES}/${path.basename(directory)}/proposal.mdx [blueprint-proposal]: the Proposal must contain a TLDR and export at least one scenario`,
      );
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
// MDX trims the leading whitespace after an opening SVG <text> on the next
// line; browsers then treat the first rendered line as empty.
const SVG_TEXT_OPEN_ON_OWN_LINE = /<text\b[^>]*>[ \t]*\r?\n/;

function withoutFencedCode(content) {
  let fence;
  return content
    .split(/\r?\n/u)
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})/u)?.[1];
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

async function validateMdxSource(root, directories) {
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
      if (SVG_TEXT_OPEN_ON_OWN_LINE.test(withoutFencedCode(content))) {
        diagnostics.push(
          `${path.relative(root, filePath)} [blueprint-svg-text]: an SVG <text> opening tag must be followed by content on the same line`,
        );
      }
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

// ADR-0065: soft target, never a hard failure -- a Sharded Change (its
// Shard trailer, ADR-0093, or --sharded-change) is the only escape hatch.
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
  if (options.shardedChangeSlug ?? options.migrationSlug) return [];
  if (await hasShardTrailer(root, base)) return [];

  return [
    `src [change-scope]: ${changedFiles.length} files changed against ${base} exceeds the soft target of ${CHANGE_SCOPE_SOFT_LIMIT}; deliver it as a Sharded Change (branch <prefix>/<slug>-s<N>, commits carrying "Shard: <N>", or --sharded-change <slug>) or split the Change`,
  ];
}

// Proposal scenarios are the other ADR-0065 soft target. Only the Change in
// hand is measured: every other page is already past its gates, and warning on
// it again on every run teaches people to ignore the warning.
async function checkChangeSizeWarnings(root, slug) {
  if (!slug) return [];
  const page = await readChangeDir(path.join(root, BLUEPRINT_CHANGES, slug));
  if (page.index === undefined) return [];
  const count = scenarioCount(page.proposal);
  if (count <= SCENARIO_COUNT_SOFT_LIMIT) return [];
  return [
    `${BLUEPRINT_CHANGES}/${slug}/proposal.mdx [change-scope]: ${count} acceptance scenarios exceeds the soft target of ${SCENARIO_COUNT_SOFT_LIMIT}; split the Change`,
  ];
}

// ADR-0057: a Change branch is known by its name.
async function changeSlugFromBranch(root) {
  try {
    return changeSlugOf(await git(root, ["rev-parse", "--abbrev-ref", "HEAD"]));
  } catch {
    return undefined;
  }
}

export async function checkChangeScope(root = process.cwd(), options = {}) {
  const slug = options.gateSlug ?? (await changeSlugFromBranch(root));
  return [
    ...(await checkFileCountScope(root, options)),
    ...(await checkChangeSizeWarnings(root, slug)),
  ];
}

// See ADR-0091.
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
  }

  diagnostics.push(...(await validateInternalLinks(root)));
  diagnostics.push(...(await validateTestTiers(root)));
  const directories = await changeDirectories(root);
  diagnostics.push(...(await validateChangePages(directories)));
  diagnostics.push(...(await validateMdxSource(root, directories)));
  diagnostics.push(...(await validateSharedSkills(root)));

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

const TAB_NAMES = new Set(["Proposal", "Review"]);

function frontmatterTitle(content) {
  const titleMatch = content.match(/^title:\s*(.*)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const quoted = title.match(/^(["'])(.*)\1$/);
  return quoted ? quoted[2] : title;
}

// Searched by directory, not facts.json: a conversion rewrites a page's files
// without its facts (ADR-0095).
async function acceptedFiles(root, slug, isAccepted, files) {
  let shas;
  try {
    const output = await git(root, [
      "log",
      "--format=%H",
      REMOTE_REF,
      "--",
      `${slug}/`,
    ]);
    shas = output ? output.split("\n") : [];
  } catch {
    return undefined;
  }
  for (const sha of shas) {
    let facts;
    try {
      facts = JSON.parse(
        await git(root, ["show", `${sha}:${slug}/facts.json`]),
      );
    } catch {
      continue;
    }
    if (!isAccepted(facts)) continue;
    const accepted = {};
    for (const file of files) {
      try {
        accepted[file] = await git(root, ["show", `${sha}:${slug}/${file}`]);
      } catch {
        return { predatesSplit: true };
      }
    }
    return accepted;
  }
  return undefined;
}

const PREDATES_SPLIT =
  "was accepted before pages were split into a file per tab, so there is nothing to compare; publish it again at its gate to record a comparable version";

async function refreshStore(root) {
  await fetchChanges(await resolveRemote(root), root);
}

async function currentBranch(root) {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => "");
}

export async function checkChangePageGate(
  root,
  slug,
  { refresh = refreshStore, branch } = {},
) {
  const page = await readChangeDir(path.join(root, BLUEPRINT_CHANGES, slug));
  if (page.index === undefined) return [];

  const where = (file) => `${BLUEPRINT_CHANGES}/${slug}/${file}`;
  const diagnostics = [];

  const title = frontmatterTitle(page.index);
  if (!title || TAB_NAMES.has(title)) {
    diagnostics.push(
      `${where("index.mdx")} [gate-title]: title must be the Change's name, not empty or a tab name`,
    );
  }

  const files = [
    ["proposal.mdx", page.proposal],
    ...page.reviews.map((review) => [review.file, review.content]),
  ];
  for (const [file, content] of files) {
    if (content === undefined) continue;
    try {
      assertValidMdx(content);
    } catch (error) {
      diagnostics.push(
        `${where(file)} [gate-mdx]: the file is not valid MDX — ${error.message.split("\n")[0]}`,
      );
    }
  }
  if (diagnostics.some((diagnostic) => diagnostic.includes("[gate-mdx]"))) {
    return diagnostics;
  }
  if (page.proposal === undefined) {
    diagnostics.push(
      `${where("proposal.mdx")} [gate-proposal]: file is missing`,
    );
    return diagnostics;
  }

  const count = shardCount(page.index);
  const entries = scenarios(page.proposal);
  if (entries.some((entry) => !entry.id)) {
    diagnostics.push(
      `${where("proposal.mdx")} [gate-scenario-shape]: every entry in scenarios needs an id`,
    );
  }
  if (count !== undefined) {
    for (const entry of entries) {
      if (
        Number.isInteger(entry.shard) &&
        entry.shard >= 1 &&
        entry.shard <= count
      ) {
        continue;
      }
      diagnostics.push(
        `${where("proposal.mdx")} [gate-scenario-shape]: scenario ${entry.id} needs a shard from 1 to ${count}`,
      );
    }
  }

  const onBranch = parseChangeBranch(branch ?? (await currentBranch(root)));
  const shard =
    count !== undefined && onBranch?.slug === slug ? onBranch.shard : undefined;
  if (count !== undefined && shard === undefined) {
    diagnostics.push(
      `${where("index.mdx")} [gate-branch-state]: a Sharded Change gate runs on a shard branch, <prefix>/${slug}-s<N>`,
    );
    return diagnostics;
  }
  for (const review of page.reviews) {
    if ((review.shard === undefined) === (count === undefined)) continue;
    diagnostics.push(
      `${where(review.file)} [gate-review-file]: ${count === undefined ? "an ordinary Change's Review is review.mdx" : "a Sharded Change's Reviews are review-s<N>.mdx"}`,
    );
  }

  const review = page.reviews.find((candidate) => candidate.shard === shard);
  if (!review) return diagnostics;

  const results = new Set(resultIds(review.content));
  for (const entry of entries) {
    if (count !== undefined && entry.shard !== shard) continue;
    if (results.has(entry.id)) continue;
    diagnostics.push(
      `${where(review.file)} [gate-scenario-results]: scenario ${entry.id} has no result in ScenarioResults`,
    );
  }

  const sections = reviewSections(review.content);
  const missing = REQUIRED_REVIEW_SECTIONS.filter(
    (section) => !sections.includes(section),
  );
  if (missing.length > 0) {
    diagnostics.push(
      `${where(review.file)} [gate-review-sections]: the Review is missing ${missing.join(", ")}`,
    );
  }
  const inline = inlineReviewSections(review.content);
  if (inline.length > 0) {
    diagnostics.push(
      `${where(review.file)} [gate-review-sections]: write ${inline.join(", ")} with the opening and closing tags on their own lines`,
    );
  }

  try {
    await refresh(root);
  } catch (error) {
    diagnostics.push(
      `${where(review.file)} [gate-frozen]: could not fetch the store branch to compare accepted files with their publishes — ${error.message.split("\n")[0]}`,
    );
    return diagnostics;
  }

  const atG1 = await acceptedFiles(root, slug, (facts) => facts.gate === "G1", [
    "index.mdx",
    "proposal.mdx",
  ]);
  if (atG1?.predatesSplit) {
    diagnostics.push(
      `${where("proposal.mdx")} [gate-frozen]: ${PREDATES_SPLIT}`,
    );
  } else if (atG1 && atG1["proposal.mdx"].trim() !== page.proposal.trim()) {
    diagnostics.push(
      `${where("proposal.mdx")} [gate-frozen]: differs from the version published at G1; change it only by passing G1 again`,
    );
  }
  if (
    atG1 &&
    !atG1.predatesSplit &&
    frontmatterOf(atG1["index.mdx"]).trim() !== frontmatterOf(page.index).trim()
  ) {
    diagnostics.push(
      `${where("index.mdx")} [gate-frozen]: the frontmatter differs from the version published at G1; change it only by passing G1 again`,
    );
  }
  for (let earlier = 1; earlier <= (count ?? 0); earlier += 1) {
    if (earlier === shard) continue;
    const file = reviewFile(earlier);
    const accepted = await acceptedFiles(
      root,
      slug,
      (facts) => facts.gate === "G2" && facts.shards?.current === earlier,
      [file],
    );
    if (!accepted || accepted.predatesSplit) continue;
    const local = page.reviews.find((review) => review.shard === earlier);
    if (!local) {
      diagnostics.push(
        `${where(file)} [gate-frozen]: shard ${earlier} passed G2 with this file, which is now missing; restore it`,
      );
    } else if (accepted[file].trim() !== local.content.trim()) {
      diagnostics.push(
        `${where(file)} [gate-frozen]: differs from the version shard ${earlier} passed G2 with; change it only by passing that G2 again`,
      );
    }
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
  const page = await readChangeDir(path.join(root, BLUEPRINT_CHANGES, slug));
  if (page.reviews.length === 0) return [];

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
    shardedChangeSlug:
      flagValue(process.argv.slice(2), "--sharded-change") ??
      flagValue(process.argv.slice(2), "--migration"),
    gateSlug,
  });
  if (gateSlug) {
    const unpublished = await checkPublished(process.cwd(), gateSlug);
    if (unpublished) diagnostics.push(unpublished);
    diagnostics.push(...(await checkChangePageGate(process.cwd(), gateSlug)));
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
