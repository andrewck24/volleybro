import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { checkWorkflow, checkChangeScope } from "../check-workflow.js";

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

async function makeRepository(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "workflow-check-"));
  const files = {
    "WORKFLOW.md": validWorkflow,
    "CLAUDE.md": "Read [WORKFLOW.md](WORKFLOW.md).\n",
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
    ...overrides,
  };

  for (const [relativePath, content] of Object.entries(files)) {
    if (content === null) continue;
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }

  const bridge = path.join(root, ".claude/skills/to-spec");
  await mkdir(path.dirname(bridge), { recursive: true });
  await symlink("../../.agents/skills/to-spec", bridge);

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
    (await messages({ "CLAUDE.md": "Repository instructions.\n" })).join("\n"),
    /CLAUDE\.md.*WORKFLOW\.md/i,
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

test("accepts a Proposal with a TLDR and a Scenario", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/changes/c/proposal.mdx":
        '---\ntitle: Proposal\n---\n\n<TLDR>Summary</TLDR>\n\n<Scenario given="a" when="b" then="c" />\n',
    }),
    [],
  );
});

test("reports a Delivery missing a TLDR or a markdown table", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/delivery.mdx":
          "---\ntitle: Delivery\n---\n\n<TLDR>Summary</TLDR>\n\nNo table here.\n",
      })
    ).join("\n"),
    /c\/delivery\.mdx.*blueprint-delivery/i,
  );
});

test("accepts a Delivery with a TLDR and a markdown table", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/changes/c/delivery.mdx":
        "---\ntitle: Delivery\n---\n\n<TLDR>Summary</TLDR>\n\n| Scenario | Result |\n| --- | --- |\n| a | pass |\n",
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

// A minimal repo for checkChangeScope: a `dev` base commit, then a feature
// branch with a given number of src/ files changed against it. `commitArgs`
// lets a test add a trailer via an extra -m.
async function makeScopeRepository(fileCount, commitArgs = []) {
  const root = await mkdtemp(path.join(os.tmpdir(), "change-scope-"));
  const git = (args) => execFileAsync("git", args, { cwd: root });

  await git(["init", "-q", "-b", "dev"]);
  await git(["config", "user.email", "test@example.com"]);
  await git(["config", "user.name", "Test"]);
  await writeFile(path.join(root, "README.md"), "init\n");
  await git(["add", "-A"]);
  await git(["commit", "-q", "-m", "init"]);

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

test("checkChangeScope never fails the process, even when it warns", async () => {
  const root = await makeRepository();
  await execFileAsync("git", ["init", "-q", "-b", "dev"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: root,
  });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: root });
  await execFileAsync("git", ["add", "-A"], { cwd: root });
  await execFileAsync("git", ["commit", "-q", "-m", "init"], { cwd: root });

  await execFileAsync("git", ["checkout", "-q", "-b", "feat/scope-test"], {
    cwd: root,
  });
  await mkdir(path.join(root, "src"), { recursive: true });
  for (let i = 0; i < 31; i += 1) {
    await writeFile(
      path.join(root, `src/file${i}.ts`),
      `export const f${i} = ${i};\n`,
    );
  }
  await execFileAsync("git", ["add", "-A"], { cwd: root });
  await execFileAsync("git", ["commit", "-q", "-m", "add files"], {
    cwd: root,
  });

  const result = await execFileAsync("node", [CHECK_WORKFLOW_SCRIPT], {
    cwd: root,
  }).catch((error) => error);

  assert.equal(result.code ?? 0, 0);
  assert.match(result.stderr, /Warning:.*change-scope/is);
});
