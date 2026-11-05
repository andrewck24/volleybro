import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  checkChangeScope,
  checkDecisionRecordLength,
  checkWorkflow,
} from "../check-workflow.js";

const execFileAsync = promisify(execFile);
const roots = [];
const CHECK_WORKFLOW_SCRIPT = fileURLToPath(
  new URL("../check-workflow.js", import.meta.url),
);

after(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

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
  "AGENTS.md":
    "Read [WORKFLOW.md](WORKFLOW.md) and docs/agents/skill-adapters.md.\n",
  "docs/agents/skill-adapters.md":
    "| Skill | Adapters |\n| --- | --- |\n| `to-spec` | `docs/agents/issue-tracker.md` |\n",
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

async function makeRepository(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "workflow-check-"));
  roots.push(root);
  await writeFiles(root, { ...REPOSITORY_FILES, ...overrides });
  const bridge = path.join(root, ".claude/skills/to-spec");
  await mkdir(path.dirname(bridge), { recursive: true });
  await symlink("../../.agents/skills/to-spec", bridge);
  return root;
}

async function messages(overrides) {
  return checkWorkflow(await makeRepository(overrides));
}

test("accepts the resolved VolleyBro delivery profile", async () => {
  assert.deepEqual(await messages(), []);
});

test("reports a missing canonical contract", async () => {
  assert.match(
    (await messages({ "WORKFLOW.md": null })).join("\n"),
    /WORKFLOW\.md \[required-file\]: file is missing/,
  );
});

test("reports a delivery adapter other than the required one", async () => {
  const workflow = validWorkflow.replace(
    "adapter: repository-workflow",
    "adapter: unknown-sdd",
  );
  assert.match(
    (await messages({ "WORKFLOW.md": workflow })).join("\n"),
    /sdd.*unknown-sdd/i,
  );
});

test("reads inline comments and flow mappings in the delivery profile", async () => {
  const workflow = validWorkflow
    .replace("version: 1", "version: 1 # delivery contract")
    .replace(
      "sdd:\n      adapter: repository-workflow",
      "sdd: { adapter: repository-workflow }",
    );
  assert.deepEqual(await messages({ "WORKFLOW.md": workflow }), []);
});

test("reports a front matter that is not valid YAML", async () => {
  const workflow = validWorkflow.replace("version: 1", "version: [1");
  const output = (await messages({ "WORKFLOW.md": workflow })).join("\n");
  assert.match(output, /WORKFLOW\.md \[delivery-profile\]/);
  assert.doesNotMatch(output, /must be 1/);
});

test("reports durable provider-text keys however YAML spells them", async () => {
  for (const spelling of [
    "evaluation: { adapter: symphony, text_retention: ephemeral, prompt_log: keep }",
    'evaluation:\n  "prompt_log": keep',
    "audit:\n  - transcript: keep",
  ]) {
    const workflow = validWorkflow.replace("\n---\n", `\n${spelling}\n---\n`);
    assert.match(
      (await messages({ "WORKFLOW.md": workflow })).join("\n"),
      /WORKFLOW\.md \[ephemeral_text\]/,
      spelling,
    );
  }
});

test("reports a delivery profile without a version", async () => {
  const workflow = validWorkflow.replace("  version: 1\n", "");
  assert.match(
    (await messages({ "WORKFLOW.md": workflow })).join("\n"),
    /WORKFLOW\.md \[delivery-profile\]: delivery\.version is missing/,
  );
});

test("reports a delivery profile version other than 1", async () => {
  const workflow = validWorkflow.replace("version: 1", "version: 2");
  assert.match(
    (await messages({ "WORKFLOW.md": workflow })).join("\n"),
    /WORKFLOW\.md \[delivery-profile\]: delivery\.version must be 1; received 2/,
  );
});

test("reports a provider bridge without the canonical pointer", async () => {
  assert.match(
    (await messages({ "AGENTS.md": "Repository instructions.\n" })).join("\n"),
    /AGENTS\.md.*WORKFLOW\.md/i,
  );
});

test("reports non-import content in CLAUDE.md", async () => {
  assert.match(
    (
      await messages({ "CLAUDE.md": "Read [WORKFLOW.md](WORKFLOW.md).\n" })
    ).join("\n"),
    /CLAUDE\.md.*guidance-import/i,
  );
});

test("reports a missing CLAUDE.md guidance import", async () => {
  assert.match(
    (await messages({ "CLAUDE.md": null })).join("\n"),
    /CLAUDE\.md \[guidance-import\]: file is missing/,
  );
});

test("reports section-number references in AGENTS.md", async () => {
  for (const reference of ["§ 2", "Section 3"]) {
    assert.match(
      (
        await messages({
          "AGENTS.md": `Read [WORKFLOW.md](WORKFLOW.md). Follow ${reference}.\n`,
        })
      ).join("\n"),
      /AGENTS\.md \[section-reference\]/,
    );
  }
});

test("reports a missing repository adapter or skill adapter map", async () => {
  for (const adapter of [
    "docs/agents/artifact-lifecycle.md",
    "docs/agents/skill-adapters.md",
  ]) {
    assert.match(
      (await messages({ [adapter]: null })).join("\n"),
      new RegExp(`${adapter.replaceAll(".", "\\.")} \\[required-file\\]`),
      adapter,
    );
  }
});

test("reports a missing AGENTS.md", async () => {
  assert.match(
    (await messages({ "AGENTS.md": null })).join("\n"),
    /AGENTS\.md \[workflow-bridge\]: file is missing/,
  );
});

test("reports a duplicated lifecycle in a provider bridge", async () => {
  for (const heading of ["## Lifecycle", "### Apply"]) {
    assert.match(
      (
        await messages({
          "AGENTS.md": `Read [WORKFLOW.md](WORKFLOW.md).\n\n${heading}\n`,
        })
      ).join("\n"),
      /AGENTS\.md \[workflow-bridge\]: duplicated lifecycle/,
      heading,
    );
  }
});

test("reports durable provider-text retention", async () => {
  assert.match(
    (
      await messages({
        "WORKFLOW.md": validWorkflow.replace(
          "text_retention: ephemeral",
          "text_retention: durable",
        ),
      })
    ).join("\n"),
    /text_retention.*ephemeral/i,
  );
});

test("reports when shared agent skills are ignored", async () => {
  assert.match(
    (await messages({ ".gitignore": ".agents/\n" })).join("\n"),
    /\.agents\/.*Git tracking/i,
  );
});

test("reports a missing or invalid skills lock", async () => {
  for (const [lock, diagnostic] of [
    [null, "file is missing"],
    ["{", "invalid JSON"],
  ]) {
    assert.match(
      (await messages({ "skills-lock.json": lock })).join("\n"),
      new RegExp(`skills-lock\\.json \\[shared-skills\\]: ${diagnostic}`),
      diagnostic,
    );
  }
});

test("reports a missing installed skill and its broken provider bridge", async () => {
  const root = await makeRepository();
  await rm(path.join(root, ".agents/skills/to-spec"), { recursive: true });
  const report = (await checkWorkflow(root)).join("\n");
  assert.match(
    report,
    /\.agents\/skills\/to-spec\/SKILL\.md \[shared-skills\]: installed skill target is missing/,
  );
  assert.match(
    report,
    /\.claude\/skills\/to-spec \[shared-skills\]: provider skill bridge is missing or broken/,
  );
});

test("reports a provider skill bridge that is not a symlink", async () => {
  const root = await makeRepository();
  const bridge = path.join(root, ".claude/skills/to-spec");
  await rm(bridge);
  await mkdir(bridge);
  assert.match(
    (await checkWorkflow(root)).join("\n"),
    /\.claude\/skills\/to-spec \[shared-skills\]: provider skill bridge must be a symlink/,
  );
});

test("reports a provider skill bridge that targets another directory", async () => {
  const root = await makeRepository();
  const bridge = path.join(root, ".claude/skills/to-spec");
  await rm(bridge);
  await symlink("../../.agents/skills", bridge);
  assert.match(
    (await checkWorkflow(root)).join("\n"),
    /\.claude\/skills\/to-spec \[shared-skills\]: symlink must target \.agents\/skills\/to-spec/,
  );
});

test("reports an installed skill without an adapter row", async () => {
  assert.match(
    (
      await messages({
        ".agents/skills/local-skill/SKILL.md": "# Local skill\n",
      })
    ).join("\n"),
    /\[skill-adapter\]: local-skill has no row/,
  );
});

test("reports an AGENTS.md that does not point to the skill adapter map", async () => {
  assert.match(
    (
      await messages({ "AGENTS.md": "Read [WORKFLOW.md](WORKFLOW.md).\n" })
    ).join("\n"),
    /AGENTS\.md \[skill-adapter\]: must point to/,
  );
});

test("reports an adapter row that names neither paths nor no adapter", async () => {
  const agents = REPOSITORY_FILES["docs/agents/skill-adapters.md"].replace(
    "`docs/agents/issue-tracker.md`",
    "issue tracker",
  );
  assert.match(
    (await messages({ "docs/agents/skill-adapters.md": agents })).join("\n"),
    /row to-spec must list adapter paths/,
  );
});

test("reports an adapter row naming a missing file or no installed skill", async () => {
  const agents = REPOSITORY_FILES["docs/agents/skill-adapters.md"].replace(
    "`docs/agents/issue-tracker.md`",
    "`docs/agents/missing.md`",
  );
  const diagnostics = (
    await messages({
      "docs/agents/skill-adapters.md": agents + "| `removed` | no adapter |\n",
    })
  ).join("\n");
  assert.match(diagnostics, /to-spec names docs\/agents\/missing\.md/);
  assert.match(diagnostics, /row removed names no installed skill/);
});

test("accepts each test tier in its own home", async () => {
  assert.deepEqual(
    await messages({
      "src/entities/game.test.ts": "",
      "test/integration/api/game-rally.itest.ts": "",
      "test/integration/persistence/transactions.itest.ts": "",
      "test/integration/support/seed.ts": "",
      "test/e2e/record-a-rally.e2e.ts": "",
    }),
    [],
  );
});

test("reports tests whose suffix does not match their directory", async () => {
  const report = (
    await messages({
      "test/integration/api/game-rally.test.ts": "",
      "test/integration/game-rally.itest.ts": "",
      "src/entities/game.itest.ts": "",
      "test/integration/api/record-a-rally.e2e.ts": "",
      "src/entities/game.spec.ts": "",
    })
  ).join("\n");
  assert.match(report, /api\/game-rally\.test\.ts \[test-tier\]/);
  assert.match(report, /integration\/game-rally\.itest\.ts \[test-tier\]/);
  assert.match(report, /src\/entities\/game\.itest\.ts \[test-tier\]/);
  assert.match(report, /api\/record-a-rally\.e2e\.ts \[test-tier\]/);
  assert.match(report, /game\.spec\.ts \[test-tier\]/);
});

test("reports malformed snippet props in Feature MDX", async () => {
  for (const [form, snippet] of [
    ["a bare string attribute", '<AnnotatedDiff\n  code="one" />'],
    ["a multi-line template literal", "<AnnotatedDiff code={`one\ntwo`} />"],
  ]) {
    assert.match(
      (
        await messages({
          "blueprint/content/features/demo/index.mdx": `---\ntitle: Demo\n---\n\n${snippet}\n`,
        })
      ).join("\n"),
      new RegExp(
        `features/demo/index\\.mdx \\[blueprint-snippet\\]: a snippet prop is ${form}`,
      ),
      form,
    );
  }
});

test("accepts escaped snippet props in Feature MDX", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/features/demo/index.mdx":
        '---\ntitle: Demo\n---\n\n<AnnotatedDiff code={"one\\ntwo"} />\n',
    }),
    [],
  );
});

test("reports SVG text when its content starts on the next line", async () => {
  const report = (
    await messages({
      "blueprint/content/features/demo/index.mdx":
        "---\ntitle: Demo\n---\n\n<svg>\n  <text>\n    visible label\n  </text>\n</svg>\n",
    })
  ).join("\n");
  assert.match(report, /blueprint-svg-text.*same line/i);
});

test("accepts SVG text when visible content follows the opening tag", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/features/demo/index.mdx":
        "---\ntitle: Demo\n---\n\n<svg><text>Visible label</text></svg>\n",
    }),
    [],
  );
});

test("does not inspect SVG examples in fenced code blocks", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/features/demo/index.mdx":
        "---\ntitle: Demo\n---\n\n```svg\n<text>\nvisible label\n</text>\n```\n",
    }),
    [],
  );
});

async function initGitRepository(prefix, seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  roots.push(root);
  const git = (args) => execFileAsync("git", args, { cwd: root });
  await git(["init", "-q", "-b", "main"]);
  await git(["config", "user.email", "test@example.com"]);
  await git(["config", "user.name", "Test"]);
  await writeFile(path.join(root, "README.md"), "init\n");
  await seed?.(root);
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "init"]);
  return { root, git };
}

async function makeScopeRepository(fileCount, commitArgs = []) {
  const { root, git } = await initGitRepository("change-scope");
  await git(["checkout", "-q", "-b", "feat/scope-test"]);
  await mkdir(path.join(root, "src"), { recursive: true });
  for (let index = 0; index < fileCount; index += 1) {
    await writeFile(
      path.join(root, "src", `file${index}.ts`),
      `export const value${index} = ${index};\n`,
    );
  }
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add files", ...commitArgs]);
  return root;
}

async function initWorkflowRepository(prefix) {
  const { root, git } = await initGitRepository(prefix, async (directory) => {
    await writeFiles(directory, REPOSITORY_FILES);
    const bridge = path.join(directory, ".claude/skills/to-spec");
    await mkdir(path.dirname(bridge), { recursive: true });
    await symlink("../../.agents/skills/to-spec", bridge);
  });
  await git(["checkout", "-q", "-b", `feat/${prefix}`]);
  return { root, git };
}

async function addSourceFiles(root, git, count, message) {
  await mkdir(path.join(root, "src"), { recursive: true });
  for (let index = 0; index < count; index += 1) {
    await writeFile(path.join(root, "src", `file${index}.ts`), "export {};\n");
  }
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", message]);
}

test("checkChangeScope is silent outside a Git repository", async () => {
  assert.deepEqual(await checkChangeScope(await makeRepository()), []);
});

test("checkChangeScope accepts a Shard trailer", async () => {
  assert.deepEqual(
    await checkChangeScope(await makeScopeRepository(31, ["-m", "Shard: 2"])),
    [],
  );
});

test("checkChangeScope does not treat a Shard mention in prose as a trailer", async () => {
  const warnings = await checkChangeScope(
    await makeScopeRepository(31, [
      "-m",
      "This work mentions Shard: 2 in prose, not a trailer.",
    ]),
  );
  assert.equal(warnings.length, 1);
});

test("the workflow CLI exits non-zero and prints its diagnostics to stderr", async () => {
  const root = await makeRepository({ "CLAUDE.md": "Repository notes.\n" });
  await assert.rejects(
    execFileAsync("node", [CHECK_WORKFLOW_SCRIPT], { cwd: root }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /- CLAUDE\.md \[guidance-import\]/);
      return true;
    },
  );
});

test("the workflow CLI keeps scope warnings non-blocking", async () => {
  const { root, git } = await initWorkflowRepository("workflow-cli");
  await addSourceFiles(root, git, 31, "large source batch");

  const result = await execFileAsync("node", [CHECK_WORKFLOW_SCRIPT], {
    cwd: root,
  });
  assert.match(result.stderr, /Warning:.*31 files changed/is);
});

test("the CLI accepts --change-shards for a large delivery batch", async () => {
  const { root, git } = await initWorkflowRepository("workflow-mapped-cli");
  await addSourceFiles(root, git, 31, "large source batch");

  const result = await execFileAsync(
    "node",
    [CHECK_WORKFLOW_SCRIPT, "--change-shards", "emdash-blueprint-change-pages"],
    { cwd: root },
  );
  assert.doesNotMatch(result.stderr, /Warning:.*files changed/is);
});

test("checkDecisionRecordLength accepts a decision at the limit", async () => {
  const { root, git } = await initGitRepository("decision-length-ok");
  await git(["checkout", "-q", "-b", "feat/decision-length"]);
  await writeFiles(root, {
    "blueprint/content/decisions/0124-decision-length.json": `${JSON.stringify({
      schemaVersion: 2,
      id: "0124",
      title: "Decision length",
      capabilities: ["platform/blueprint"],
      decision: "d".repeat(1000),
    })}\n`,
  });
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add decision"]);
  assert.deepEqual(await checkDecisionRecordLength(root), []);
});

test("checkDecisionRecordLength does not re-warn for an edited decision", async () => {
  const originalDecision = {
    schemaVersion: 2,
    id: "0123",
    title: "Existing decision",
    capabilities: ["platform/blueprint"],
    decision: "short",
  };
  const { root, git } = await initGitRepository(
    "decision-length-existing",
    async (directory) => {
      await writeFiles(directory, {
        "blueprint/content/decisions/0123-existing.json": `${JSON.stringify(originalDecision)}\n`,
      });
    },
  );
  await git(["checkout", "-q", "-b", "feat/decision-length-existing"]);
  await writeFiles(root, {
    "blueprint/content/decisions/0123-existing.json": `${JSON.stringify({ ...originalDecision, decision: "d".repeat(1001) })}\n`,
  });
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "edit existing decision"]);
  assert.deepEqual(await checkDecisionRecordLength(root), []);
});

test("the CLI keeps oversized-decision warnings non-blocking", async () => {
  const { root, git } = await initWorkflowRepository("decision-length-cli");
  await writeFiles(root, {
    "blueprint/content/decisions/0124-oversized.json": `${JSON.stringify({
      schemaVersion: 2,
      id: "0124",
      title: "Oversized decision",
      capabilities: ["platform/blueprint"],
      decision: "d".repeat(1001),
    })}\n`,
  });
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "add oversized decision"]);
  const result = await execFileAsync("node", [CHECK_WORKFLOW_SCRIPT], {
    cwd: root,
  });
  assert.match(result.stderr, /Warning:.*1001 characters/is);
});
