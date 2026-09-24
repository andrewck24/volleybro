import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { hashDir } from "../blueprint-changes.js";

import {
  checkWorkflow,
  checkChangeScope,
  checkPublished,
  checkGateTitles,
  checkSinglePageGate,
  checkGateBranchState,
  checkDecisionRecordLength,
} from "../check-workflow.js";

const execFileAsync = promisify(execFile);
const CHECK_WORKFLOW_SCRIPT = fileURLToPath(
  new URL("../check-workflow.js", import.meta.url),
);

const validWorkflow = `---
delivery:
  version: 1
  capabilities:
    sdd:
      adapter: repository-workflow
    change_comprehension:
      adapter: blueprint
    release_planning:
      adapter: linear
      mode: milestone
    versioning:
      adapter: changesets
    workpad:
      adapter: linear-comment
    scm:
      adapter: github
    review:
      adapter: github-pr
    validation:
      adapter: repository-commands
    archive:
      adapter: repository-workflow
    evaluation:
      adapter: symphony
      text_retention: ephemeral
---

# Delivery contract
`;

const REPOSITORY_FILES = {
  "WORKFLOW.md": validWorkflow,
  "CLAUDE.md": "@AGENTS.md\n",
  "AGENTS.md": "Read [WORKFLOW.md](WORKFLOW.md).\n",
  "docs/agents/issue-tracker.md": "# Issue tracker adapter\n",
  "docs/agents/domain.md": "# Domain documentation adapter\n",
  "docs/agents/blueprint.md": "# Blueprint adapter\n",
  "docs/agents/artifact-lifecycle.md": "# Artifact lifecycle adapter\n",
  "CONTRIBUTING.md": "Read WORKFLOW.md before delivery work.\n",
  ".gitignore": ".agents/settings.local.*\n",
  "skills-lock.json": JSON.stringify({
    version: 1,
    skills: { "to-spec": {} },
  }),
  ".agents/skills/to-spec/SKILL.md": "# To spec\n",
};

async function writeFiles(root, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    if (content === null) continue;
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
}

async function addSkillBridge(root) {
  const bridge = path.join(root, ".claude/skills/to-spec");
  await mkdir(path.dirname(bridge), { recursive: true });
  await symlink("../../.agents/skills/to-spec", bridge);
}

async function makeRepository(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "workflow-check-"));
  await writeFiles(root, { ...REPOSITORY_FILES, ...overrides });
  await addSkillBridge(root);
  return root;
}

async function messages(overrides) {
  const root = await makeRepository(overrides);
  return checkWorkflow(root);
}

test("accepts the resolved VolleyBro delivery profile", async () => {
  assert.deepEqual(await messages(), []);
});

test("reports a missing canonical contract", async () => {
  assert.match(
    (await messages({ "WORKFLOW.md": null })).join("\n"),
    /WORKFLOW\.md.*missing/i,
  );
});

test("reports an unsupported delivery adapter", async () => {
  const workflow = validWorkflow.replace(
    "adapter: repository-workflow",
    "adapter: unknown-sdd",
  );
  assert.match(
    (await messages({ "WORKFLOW.md": workflow })).join("\n"),
    /sdd.*unknown-sdd/i,
  );
});

test("reports a provider bridge without the canonical pointer", async () => {
  assert.match(
    (await messages({ "AGENTS.md": "Repository instructions.\n" })).join("\n"),
    /AGENTS\.md.*WORKFLOW\.md/i,
  );
});

test("accepts CLAUDE.md containing exactly the guidance import line", async () => {
  assert.deepEqual(await messages(), []);
});

test("reports CLAUDE.md content other than the guidance import", async () => {
  assert.match(
    (
      await messages({ "CLAUDE.md": "Read [WORKFLOW.md](WORKFLOW.md).\n" })
    ).join("\n"),
    /CLAUDE\.md.*guidance-import/i,
  );
});

test("reports a missing CLAUDE.md", async () => {
  assert.match(
    (await messages({ "CLAUDE.md": null })).join("\n"),
    /CLAUDE\.md.*guidance-import/i,
  );
});

test("reports a section-number reference in AGENTS.md", async () => {
  assert.match(
    (
      await messages({
        "AGENTS.md": "Read [WORKFLOW.md](WORKFLOW.md) §5.\n",
      })
    ).join("\n"),
    /AGENTS\.md.*section-reference/i,
  );
});

test("reports a spelled-out section-number reference in AGENTS.md", async () => {
  assert.match(
    (
      await messages({
        "AGENTS.md": "Read [WORKFLOW.md](WORKFLOW.md), see section 5.\n",
      })
    ).join("\n"),
    /AGENTS\.md.*section-reference/i,
  );
});

test("reports the Pre-PR gate section missing CODING_STANDARDS.md", async () => {
  const workflow = `${validWorkflow}\n### 3. Pre-PR gate and delivery\n\nFollow CONTRIBUTING.md.\n\n### 4. Archive\n`;
  assert.match(
    (await messages({ "WORKFLOW.md": workflow })).join("\n"),
    /WORKFLOW\.md.*standards-reviewer/i,
  );
});

test("reports a Pre-PR gate section that still cites CONTRIBUTING.md", async () => {
  const workflow = `${validWorkflow}\n### 3. Pre-PR gate and delivery\n\nFollow CODING_STANDARDS.md and CONTRIBUTING.md.\n\n### 4. Archive\n`;
  assert.match(
    (await messages({ "WORKFLOW.md": workflow })).join("\n"),
    /must not mention CONTRIBUTING\.md/,
  );
});

test("accepts a Pre-PR gate section that cites CODING_STANDARDS.md only", async () => {
  const workflow = `${validWorkflow}\n### 3. Pre-PR gate and delivery\n\nFollow CODING_STANDARDS.md.\n\n### 4. Archive\n`;
  assert.deepEqual(await messages({ "WORKFLOW.md": workflow }), []);
});

test("is silent about Pre-PR gate wording when the section is absent", async () => {
  assert.deepEqual(await messages(), []);
});

test("reports Spectra as an active authority in CODING_STANDARDS.md", async () => {
  assert.match(
    (
      await messages({
        "CODING_STANDARDS.md": "Use Spectra artifacts for review.\n",
      })
    ).join("\n"),
    /CODING_STANDARDS\.md.*retired-authority/i,
  );
});

test("reports Spectra as an active authority in AGENTS.md", async () => {
  assert.match(
    (
      await messages({
        "AGENTS.md":
          "Read [WORKFLOW.md](WORKFLOW.md). Use Spectra artifacts.\n",
      })
    ).join("\n"),
    /AGENTS\.md.*retired-authority/i,
  );
});

test("reports duplicated lifecycle content in a provider bridge", async () => {
  const bridge =
    "Read [WORKFLOW.md](WORKFLOW.md).\n\n## Lifecycle\n\n### Apply\n";
  assert.match(
    (await messages({ "AGENTS.md": bridge })).join("\n"),
    /AGENTS\.md.*lifecycle/i,
  );
});

test("reports durable provider-text retention", async () => {
  const workflow = validWorkflow.replace(
    "text_retention: ephemeral",
    "text_retention: durable",
  );
  assert.match(
    (await messages({ "WORKFLOW.md": workflow })).join("\n"),
    /text_retention.*ephemeral/i,
  );
});

test("reports a missing repository adapter file", async () => {
  assert.match(
    (await messages({ "docs/agents/artifact-lifecycle.md": null })).join("\n"),
    /artifact-lifecycle\.md.*missing/i,
  );
});

test("reports when shared agent skills are ignored", async () => {
  assert.match(
    (await messages({ ".gitignore": ".agents/\n" })).join("\n"),
    /\.agents\/.*Git tracking/i,
  );
});

test("reports a broken provider skill bridge", async () => {
  const root = await makeRepository();
  await rm(path.join(root, ".agents/skills/to-spec"), { recursive: true });
  assert.match(
    (await checkWorkflow(root)).join("\n"),
    /\.claude\/skills\/to-spec.*missing or broken/i,
  );
});

test("reports a tracked executable Spectra workflow", async () => {
  assert.match(
    (
      await messages({
        ".agents/workflows/spectra-apply.md": "# Apply\n",
      })
    ).join("\n"),
    /\.agents\/workflows\/spectra-apply\.md.*retired-workflow/i,
  );
});

test("reports an active legacy OpenSpec change", async () => {
  assert.match(
    (
      await messages({
        "docs/changes/stale-change/.openspec.yaml": "schema: spec-driven\n",
      })
    ).join("\n"),
    /docs\/changes\/stale-change\/\.openspec\.yaml.*active-legacy-change/i,
  );
});

test("reports Spectra as an active contributor authority", async () => {
  assert.match(
    (
      await messages({
        "CONTRIBUTING.md": "Use Spectra artifacts for delivery.\n",
      })
    ).join("\n"),
    /CONTRIBUTING\.md.*retired-authority/i,
  );
});

test("reports an active retired harness reference", async () => {
  assert.match(
    (
      await messages({
        "scripts/dispatch.mjs": "const harness = 'spec-loop';\n",
      })
    ).join("\n"),
    /scripts\/dispatch\.mjs.*retired/i,
  );
});

test("reports an internal link that bypasses the router", async () => {
  assert.match(
    (
      await messages({
        "blueprint/src/components/Sample.tsx":
          'export const Sample = () => <a href="/changes">Changes</a>;\n',
      })
    ).join("\n"),
    /Sample\.tsx.*blueprint-internal-link/i,
  );
});

test("accepts external links and in-page anchors", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/src/components/Sample.tsx":
        'export const Sample = () => <a href="https://volleybro.dev">Site</a>;\n',
      "blueprint/content/design-system/index.mdx":
        '<a href="#tokens">Tokens</a>\n',
    }),
    [],
  );
});

test("reports a Proposal missing a Scenario or a TLDR", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/proposal.mdx":
          "---\ntitle: Proposal\n---\n\n## Context\n",
      })
    ).join("\n"),
    /c\/proposal\.mdx.*blueprint-proposal/i,
  );
});

test("reports a Proposal missing a TLDR", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/proposal.mdx":
          '---\ntitle: Proposal\n---\n\n<Scenario given="a" when="b" then="c" />\n',
      })
    ).join("\n"),
    /c\/proposal\.mdx.*blueprint-proposal/i,
  );
});

test("skips old-format Changes from the page store", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/changes/old/change.json": "{}\n",
      "blueprint/content/changes/old/proposal.mdx":
        "---\ntitle: Old\n---\n\nNo components.\n",
      "blueprint/content/changes/old/review.mdx":
        "---\ntitle: Review\n---\n\n<FileTour files={[{ code={`a\nb`} }]} />\n",
    }),
    [],
  );
});

test("accepts a Proposal with a TLDR and a Scenario", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/changes/c/proposal.mdx":
        '---\ntitle: Proposal\n---\n\n<TLDR>Summary</TLDR>\n\n<Scenario given="a" when="b" then="c" />\n',
    }),
    [],
  );
});

test("reports a Review missing a markdown table", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/review.mdx":
          "---\ntitle: Review\n---\n\n<TLDR>Summary</TLDR>\n\nNo table here.\n",
      })
    ).join("\n"),
    /c\/review\.mdx.*blueprint-review/i,
  );
});

test("reports a Review missing a TLDR", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/review.mdx":
          "---\ntitle: Review\n---\n\n| Scenario | Result |\n| --- | --- |\n| a | pass |\n",
      })
    ).join("\n"),
    /c\/review\.mdx.*blueprint-review/i,
  );
});

test("accepts a Review with a TLDR and a markdown table", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/changes/c/review.mdx":
        "---\ntitle: Review\n---\n\n<TLDR>Summary</TLDR>\n\n| Scenario | Result |\n| --- | --- |\n| a | pass |\n",
    }),
    [],
  );
});

// MDX eats the indentation of a multi-line template literal in an attribute.
test("reports a snippet written as a multi-line template literal", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/proposal.mdx":
          "---\ntitle: Proposal\n---\n\n<AnnotatedDiff\n  code={`const a = 1;\n  const b = 2;`}\n/>\n",
      })
    ).join("\n"),
    /blueprint-snippet/i,
  );
});

test("reports a snippet written as a bare string attribute", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/proposal.mdx":
          '---\ntitle: Proposal\n---\n\n<AnnotatedDiff\n  code="const a = 1;\\n  const b = 2;"\n/>\n',
      })
    ).join("\n"),
    /blueprint-snippet.*bare string/i,
  );
});

test("accepts a snippet written as an escaped string", async () => {
  assert.doesNotMatch(
    (
      await messages({
        "blueprint/content/changes/c/proposal.mdx":
          '---\ntitle: Proposal\n---\n\n<AnnotatedDiff code={"const a = 1;\\n  const b = 2;"} />\n',
      })
    ).join("\n"),
    /blueprint-snippet/i,
  );
});

test("checkChangeScope is silent outside a git repository", async () => {
  const root = await makeRepository();
  assert.deepEqual(await checkChangeScope(root), []);
});

async function initGitRepository(prefix, branch, seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  const git = (args) => execFileAsync("git", args, { cwd: root });

  await git(["init", "-q", "-b", branch]);
  await git(["config", "user.email", "test@example.com"]);
  await git(["config", "user.name", "Test"]);
  await writeFile(path.join(root, "README.md"), "init\n");
  if (seed) await seed(root);
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "init"]);

  return { root, git };
}

// A minimal repo for checkChangeScope: a `dev` base commit, then a feature
// branch with a given number of src/ files changed against it. `commitArgs`
// lets a test add a trailer via an extra -m. `seedWorkflowFiles` also lays
// down a valid checkWorkflow() repository, for a test that runs the CLI.
async function makeScopeRepository(fileCount, commitArgs = [], options = {}) {
  const { seedWorkflowFiles = false } = options;
  const { root, git } = await initGitRepository(
    "change-scope",
    "dev",
    seedWorkflowFiles
      ? async (repoRoot) => {
          await writeFiles(repoRoot, REPOSITORY_FILES);
          await addSkillBridge(repoRoot);
        }
      : undefined,
  );

  await git(["checkout", "-q", "-b", "feat/scope-test"]);
  await mkdir(path.join(root, "src"), { recursive: true });
  for (let i = 0; i < fileCount; i += 1) {
    await writeFile(
      path.join(root, `src/file${i}.ts`),
      `export const f${i} = ${i};\n`,
    );
  }
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add files", ...commitArgs]);

  return root;
}

test("checkChangeScope warns past the soft file-count target", async () => {
  const root = await makeScopeRepository(31);
  const warnings = await checkChangeScope(root);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /change-scope/i);
  assert.match(warnings[0], /31 files changed/);
});

test("checkChangeScope accepts a Migration trailer in the commit log", async () => {
  const root = await makeScopeRepository(31, [
    "-m",
    "Migration: two-gate-workflow",
  ]);
  assert.deepEqual(await checkChangeScope(root), []);
});

test("checkChangeScope accepts a --migration slug", async () => {
  const root = await makeScopeRepository(31);
  assert.deepEqual(
    await checkChangeScope(root, { migrationSlug: "two-gate-workflow" }),
    [],
  );
});

test("checkChangeScope ignores a Migration mention outside the trailer block", async () => {
  const root = await makeScopeRepository(31, [
    "-m",
    "This work touches Migration: two-gate-workflow in prose, not a trailer.",
  ]);
  const warnings = await checkChangeScope(root);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /change-scope/i);
});

test("checkChangeScope warns past the soft scenario-count target", async () => {
  const scenarios = Array.from(
    { length: 9 },
    (_, i) => `<Scenario given="g${i}" when="w${i}" then="t${i}" />`,
  ).join("\n");
  const root = await makeRepository({
    "blueprint/content/changes/c/proposal.mdx": `---\ntitle: Proposal\n---\n\n${scenarios}\n`,
  });
  const warnings = await checkChangeScope(root);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /change-scope/i);
  assert.match(warnings[0], /9 acceptance scenarios/);
});

test("checkChangeScope never fails the process, even when it warns", async () => {
  const root = await makeScopeRepository(31, [], { seedWorkflowFiles: true });

  const result = await execFileAsync("node", [CHECK_WORKFLOW_SCRIPT], {
    cwd: root,
  }).catch((error) => error);

  assert.equal(result.code ?? 0, 0);
  assert.match(result.stderr, /Warning:.*change-scope/is);
});

test("the gate check passes when the local pages match what was published", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/review.mdx": "published\n",
  });
  const changes = path.join(root, "blueprint/content/changes");
  await writeFile(
    path.join(changes, ".store-state.json"),
    JSON.stringify({ c: await hashDir(path.join(changes, "c")) }),
  );

  assert.equal(await checkPublished(root, "c"), undefined);
});

test("the gate check reports pages edited since they were published", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/review.mdx": "published\n",
  });
  const changes = path.join(root, "blueprint/content/changes");
  await writeFile(
    path.join(changes, ".store-state.json"),
    JSON.stringify({ c: await hashDir(path.join(changes, "c")) }),
  );
  await writeFile(path.join(changes, "c/review.mdx"), "edited\n");

  assert.match(
    await checkPublished(root, "c"),
    /edited since it was published/,
  );
});

test("the gate check reports a Change that was never published", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/review.mdx": "draft\n",
  });

  assert.match(await checkPublished(root, "c"), /never published/);
});

test("the gate check reports a Change with no directory at all", async () => {
  const root = await makeRepository();

  assert.match(await checkPublished(root, "c"), /no Change directory/);
});

test("checkGateTitles reports a proposal title missing the suffix", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/proposal.mdx":
      "---\ntitle: Something\n---\n\n<TLDR>x</TLDR>\n",
  });
  assert.match(
    (await checkGateTitles(root, "c")).join("\n"),
    /proposal\.mdx.*gate-title/is,
  );
});

test("checkGateTitles reports a title whose name is just the suffix", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/review.mdx":
      "---\ntitle: Review — Review\n---\n",
  });
  assert.match(
    (await checkGateTitles(root, "c")).join("\n"),
    /review\.mdx.*gate-title/is,
  );
});

test("checkGateTitles accepts well-formed titles", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/proposal.mdx":
      "---\ntitle: Reviewer Standards Split — Proposal\n---\n",
    "blueprint/content/changes/c/review.mdx":
      "---\ntitle: Reviewer Standards Split — Review\n---\n",
  });
  assert.deepEqual(await checkGateTitles(root, "c"), []);
});

test("checkGateTitles skips pages that do not exist", async () => {
  const root = await makeRepository();
  assert.deepEqual(await checkGateTitles(root, "missing"), []);
});

test("checkGateTitles accepts a YAML-quoted title", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/proposal.mdx":
      '---\ntitle: "Reviewer Standards Split — Proposal"\n---\n',
    "blueprint/content/changes/c/review.mdx":
      "---\ntitle: 'Reviewer Standards Split — Review'\n---\n",
  });
  assert.deepEqual(await checkGateTitles(root, "c"), []);
});

// checkGateBranchState needs a real git repo (a plain temp directory of
// files, as makeRepository builds, is never one), plus a bare repo to stand
// in for the remote for the upstream scenarios.
async function makeGitRepository() {
  return initGitRepository("gate-branch", "main");
}

async function addBareRemote(git, branch = "main") {
  const bare = await mkdtemp(path.join(os.tmpdir(), "gate-remote-"));
  await execFileAsync("git", ["init", "-q", "--bare", bare]);
  await git(["remote", "add", "origin", bare]);
  await git(["push", "-q", "-u", "origin", branch]);
}

test("checkGateBranchState reports a branch with no upstream", async () => {
  const { root } = await makeGitRepository();
  assert.match(
    (await checkGateBranchState(root)).join("\n"),
    /gate-branch-state.*upstream/is,
  );
});

test("checkGateBranchState reports a branch ahead of its upstream", async () => {
  const { root, git } = await makeGitRepository();
  await addBareRemote(git);
  await writeFile(path.join(root, "extra.txt"), "x\n");
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "extra"]);
  assert.match(
    (await checkGateBranchState(root)).join("\n"),
    /gate-branch-state.*ahead/is,
  );
});

test("checkGateBranchState reports uncommitted decision records", async () => {
  const { root, git } = await makeGitRepository();
  await addBareRemote(git);
  await mkdir(path.join(root, "blueprint/content/decisions"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "blueprint/content/decisions/0099-x.json"),
    "{}\n",
  );
  assert.match(
    (await checkGateBranchState(root)).join("\n"),
    /decisions.*gate-branch-state/is,
  );
});

test("checkGateBranchState accepts a clean branch matching its upstream", async () => {
  const { root, git } = await makeGitRepository();
  await addBareRemote(git);
  assert.deepEqual(await checkGateBranchState(root), []);
});

// checkDecisionRecordLength reuses resolveScopeBase's `dev` base, so these
// repos follow makeScopeRepository's shape but change decision records
// instead of src/ files.
async function makeDecisionRepository() {
  const { root, git } = await initGitRepository("decision-length", "dev");
  await git(["checkout", "-q", "-b", "feat/decision-test"]);
  await mkdir(path.join(root, "blueprint/content/decisions"), {
    recursive: true,
  });
  return { root, git };
}

test("checkDecisionRecordLength warns past the soft character target", async () => {
  const { root, git } = await makeDecisionRepository();
  await writeFile(
    path.join(root, "blueprint/content/decisions/0099-long.json"),
    JSON.stringify({ decision: "x".repeat(1001) }),
  );
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add decision"]);

  const warnings = await checkDecisionRecordLength(root);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /decision-length/i);
  assert.match(warnings[0], /1001 characters/);
  assert.match(warnings[0], /blueprint\/content\/decisions\/0099-long\.json/);
});

test("checkDecisionRecordLength ignores records within the soft target", async () => {
  const { root, git } = await makeDecisionRepository();
  await writeFile(
    path.join(root, "blueprint/content/decisions/0099-short.json"),
    JSON.stringify({ decision: "x".repeat(1000) }),
  );
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add decision"]);

  assert.deepEqual(await checkDecisionRecordLength(root), []);
});

test("the CLI exits 0 with a decision-length warning when that is the only gate issue", async () => {
  const { root, git } = await initGitRepository(
    "decision-cli",
    "dev",
    async (repoRoot) => {
      await writeFiles(repoRoot, {
        ...REPOSITORY_FILES,
        "blueprint/content/changes/c/proposal.mdx":
          '---\ntitle: Reviewer Standards Split — Proposal\n---\n\n<TLDR>Summary</TLDR>\n\n<Scenario given="a" when="b" then="c" />\n',
        "blueprint/content/changes/c/review.mdx":
          "---\ntitle: Reviewer Standards Split — Review\n---\n\n<TLDR>Summary</TLDR>\n\n| Scenario | Result |\n| --- | --- |\n| a | pass |\n",
      });
      await addSkillBridge(repoRoot);

      const changesDir = path.join(repoRoot, "blueprint/content/changes");
      await writeFile(
        path.join(changesDir, ".store-state.json"),
        JSON.stringify({ c: await hashDir(path.join(changesDir, "c")) }),
      );
    },
  );
  await addBareRemote(git, "dev");

  await git(["checkout", "-q", "-b", "feat/decision-warn"]);
  await mkdir(path.join(root, "blueprint/content/decisions"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "blueprint/content/decisions/0099-long.json"),
    JSON.stringify({ decision: "x".repeat(1001) }),
  );
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add decision"]);
  await git(["push", "-q", "-u", "origin", "feat/decision-warn"]);

  const result = await execFileAsync(
    "node",
    [CHECK_WORKFLOW_SCRIPT, "--gate", "c"],
    { cwd: root },
  ).catch((error) => error);

  assert.equal(result.code ?? 0, 0);
  assert.match(result.stderr, /Warning:.*decision-length/is);
  assert.match(result.stderr, /blueprint\/content\/decisions\/0099-long\.json/);
});

test("checkDecisionRecordLength ignores a record that only changed", async () => {
  const { root, git } = await makeDecisionRepository();
  await writeFile(
    path.join(root, "blueprint/content/decisions/0099-existing.json"),
    JSON.stringify({ decision: "short" }),
  );
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add decision"]);
  await git(["checkout", "-q", "dev"]);
  await git(["merge", "-q", "feat/decision-test"]);
  await git(["checkout", "-q", "-b", "feat/modify-test"]);
  await writeFile(
    path.join(root, "blueprint/content/decisions/0099-existing.json"),
    JSON.stringify({ decision: "x".repeat(1001) }),
  );
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "modify decision"]);

  assert.deepEqual(await checkDecisionRecordLength(root), []);
});

function singlePage({
  title = "Sample",
  proposal = "<TLDR>x</TLDR>",
  review,
} = {}) {
  const reviewTab =
    review === undefined ? "" : `<Review>\n${review}\n</Review>\n`;
  return `---\ntitle: ${title}\n---\n\nexport const scenarios = [\n  { id: "S1", given: "a", when: "b", then: "c" },\n  { id: "S2", given: "d", when: "e", then: "f" },\n];\n\n<ChangeTabs>\n<Proposal>\n${proposal}\n<Scenarios items={scenarios} />\n</Proposal>\n${reviewTab}</ChangeTabs>\n`;
}

const FULL_REVIEW = [
  "<ActionItems>無</ActionItems>",
  "<ReviewFocus>- a</ReviewFocus>",
  "<Deviations>無</Deviations>",
  '<ScenarioResults scenarios={scenarios} results={[{ id: "S1", result: "pass", evidence: "t" }, { id: "S2", result: "pass", evidence: "t" }]} />',
  "<TestPlan items={[]} />",
  "<ReviewDetails>d</ReviewDetails>",
].join("\n");

async function singlePageGate(content) {
  const root = await makeRepository({
    "blueprint/content/changes/c/index.mdx": content,
  });
  return (await checkSinglePageGate(root, "c")).join("\n");
}

test("single-page gate accepts a complete G1 page", async () => {
  assert.equal(await singlePageGate(singlePage()), "");
});

test("single-page gate accepts a complete G2 page", async () => {
  assert.equal(await singlePageGate(singlePage({ review: FULL_REVIEW })), "");
});

test("single-page gate reports a title that is only a tab name", async () => {
  assert.match(
    await singlePageGate(singlePage({ title: "Proposal" })),
    /index\.mdx.*gate-title/is,
  );
});

test("single-page gate names a scenario with no result", async () => {
  const review = FULL_REVIEW.replace(
    ', { id: "S2", result: "pass", evidence: "t" }',
    "",
  );
  assert.match(
    await singlePageGate(singlePage({ review })),
    /gate-scenario-results.*S2/is,
  );
});

test("single-page gate reports a missing required Review section", async () => {
  const review = FULL_REVIEW.replace("<ReviewFocus>- a</ReviewFocus>\n", "");
  assert.match(
    await singlePageGate(singlePage({ review })),
    /gate-review-sections.*ReviewFocus/is,
  );
});

test("single-page gate reports Review sections out of order", async () => {
  const review = FULL_REVIEW.replace(
    "<ActionItems>無</ActionItems>\n<ReviewFocus>- a</ReviewFocus>",
    "<ReviewFocus>- a</ReviewFocus>\n<ActionItems>無</ActionItems>",
  );
  assert.match(
    await singlePageGate(singlePage({ review })),
    /gate-review-sections/i,
  );
});

test("single-page gate ignores two-page and old-format Changes", async () => {
  const root = await makeRepository({
    "blueprint/content/changes/c/proposal.mdx":
      "---\ntitle: A — Proposal\n---\n",
    "blueprint/content/changes/d/index.mdx": "---\ntitle: Proposal\n---\n",
    "blueprint/content/changes/d/change.json": "{}",
  });
  assert.deepEqual(await checkSinglePageGate(root, "c"), []);
  assert.deepEqual(await checkSinglePageGate(root, "d"), []);
});

// A store branch holding a G1 publish and then a G2 publish of slug c,
// fetched into the checkout under the ref the publish script uses.
async function withStoreHistory(root, g1Page) {
  const store = await mkdtemp(path.join(os.tmpdir(), "store-"));
  const run = (args, cwd) => execFileAsync("git", args, { cwd });
  await run(["init", "-q", "-b", "blueprint-changes"], store);
  await run(["config", "user.email", "t@example.com"], store);
  await run(["config", "user.name", "T"], store);
  await mkdir(path.join(store, "c"), { recursive: true });
  await writeFile(path.join(store, "c/index.mdx"), g1Page);
  await writeFile(
    path.join(store, "c/facts.json"),
    JSON.stringify({ gate: "G1" }),
  );
  await run(["add", "-A"], store);
  await run(["commit", "-q", "-m", "publish c"], store);
  await writeFile(
    path.join(store, "c/facts.json"),
    JSON.stringify({ gate: "G2" }),
  );
  await run(["add", "-A"], store);
  await run(["commit", "-q", "-m", "publish c"], store);

  await run(["init", "-q"], root);
  await run(
    ["fetch", "-q", store, "blueprint-changes:refs/blueprint-changes/remote"],
    root,
  );
}

test("single-page gate passes a G2 page whose Proposal matches G1", async () => {
  const page = singlePage({ review: FULL_REVIEW });
  const root = await makeRepository({
    "blueprint/content/changes/c/index.mdx": page,
  });
  await withStoreHistory(root, singlePage());
  assert.deepEqual(await checkSinglePageGate(root, "c"), []);
});

test("single-page gate fails a G2 page whose Proposal changed after G1", async () => {
  const page = singlePage({
    proposal: "<TLDR>rewritten</TLDR>",
    review: FULL_REVIEW,
  });
  const root = await makeRepository({
    "blueprint/content/changes/c/index.mdx": page,
  });
  await withStoreHistory(root, singlePage());
  assert.match(
    (await checkSinglePageGate(root, "c")).join("\n"),
    /gate-proposal-frozen/i,
  );
});

test("single-page gate skips the freeze check without a G1 publish", async () => {
  const page = singlePage({
    proposal: "<TLDR>rewritten</TLDR>",
    review: FULL_REVIEW,
  });
  const root = await makeRepository({
    "blueprint/content/changes/c/index.mdx": page,
  });
  assert.deepEqual(await checkSinglePageGate(root, "c"), []);
});
