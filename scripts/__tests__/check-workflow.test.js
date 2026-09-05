import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkWorkflow } from "../check-workflow.js";

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

test("reports Overview metadata restated as MDX props", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/sample/index.mdx":
          '---\ntitle: Overview\n---\n\n<ChangeOverview date="2026-08-08" />\n',
      })
    ).join("\n"),
    /sample\/index\.mdx.*blueprint-overview-source/i,
  );
});

test("accepts an Overview that carries narrative content only", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/content/changes/sample/index.mdx":
        "---\ntitle: Overview\n---\n\n## Context\n",
    }),
    [],
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

test("reports a design module without its interactive design page", async () => {
  assert.match(
    (
      await messages({
        "blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx":
          'const designModules = {\n  "moved-change/design": () => import("x"),\n};\n',
      })
    ).join("\n"),
    /moved-change\/design\.tsx.*does not exist/i,
  );
});

test("accepts a design module whose design page exists", async () => {
  assert.deepEqual(
    await messages({
      "blueprint/src/app/(docs)/changes/[[...slug]]/page.tsx":
        'const designModules = {\n  "kept-change/design": () => import("x"),\n};\n',
      "blueprint/content/changes/kept-change/design.tsx":
        "export default () => null;\n",
    }),
    [],
  );
});

const change = (lifecycle) => JSON.stringify({ slug: "c", lifecycle });
const meta = (...pages) => JSON.stringify({ title: "c", pages });
const tour = (entry) =>
  `---\ntitle: Review\n---\n\n<FileTour\n  files={[\n    {\n${entry}\n    },\n  ]}\n/>\n`;

test("reports a Change awaiting delivery review with no review page", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/change.json": change(
          "awaiting-delivery-review",
        ),
        "blueprint/content/changes/c/meta.json": meta("index"),
      })
    ).join("\n"),
    /blueprint-review.*review page/i,
  );
});

test("accepts a Change awaiting delivery review that carries one", async () => {
  const gaps = (
    await messages({
      "blueprint/content/changes/c/change.json": change(
        "awaiting-delivery-review",
      ),
      "blueprint/content/changes/c/meta.json": meta("index", "review"),
      "blueprint/content/changes/c/review.mdx": tour(
        `      path: "src/a.ts",\n      change: "modified",\n      code: "const a = 1;",`,
      ),
    })
  ).join("\n");
  assert.doesNotMatch(gaps, /blueprint-review/i);
  assert.doesNotMatch(gaps, /blueprint-file-tour/i);
});

test("reports a review FileTour entry with no code", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/change.json": change("applying"),
        "blueprint/content/changes/c/meta.json": meta("index", "review"),
        "blueprint/content/changes/c/review.mdx": tour(
          `      path: "src/a.ts",\n      change: "modified",\n      summary: "why",`,
        ),
      })
    ).join("\n"),
    /blueprint-file-tour.*src\/a\.ts/i,
  );
});

// A snippet may contain "/>" of its own; the tour closes on its array literal.
test("finds a later entry past a snippet that contains a JSX close", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/change.json": change("applying"),
        "blueprint/content/changes/c/meta.json": meta("index", "review"),
        "blueprint/content/changes/c/review.mdx":
          `---\ntitle: Review\n---\n\n<FileTour\n  files={[\n` +
          `    {\n      path: "src/a.tsx",\n      change: "modified",\n      code: '<Thing a="1" />',\n    },\n` +
          `    {\n      path: "src/b.ts",\n      change: "modified",\n      summary: "why",\n    },\n` +
          `  ]}\n/>\n`,
      })
    ).join("\n"),
    /blueprint-file-tour.*src\/b\.ts/i,
  );
});

test("leaves an archived Change's review alone", async () => {
  assert.doesNotMatch(
    (
      await messages({
        "blueprint/content/changes/c/change.json": change("archived"),
        "blueprint/content/changes/c/meta.json": meta("index", "review"),
        "blueprint/content/changes/c/review.mdx": tour(
          `      path: "src/a.ts",\n      change: "modified",\n      summary: "why",`,
        ),
      })
    ).join("\n"),
    /blueprint-file-tour/i,
  );
});

test("reports an implementation page that writes its own slice progress", async () => {
  assert.match(
    (
      await messages({
        "blueprint/content/changes/c/change.json": change("applying"),
        "blueprint/content/changes/c/meta.json": meta(
          "index",
          "implementation",
        ),
        "blueprint/content/changes/c/implementation.mdx":
          "---\ntitle: Implementation\n---\n\n<TaskProgress done={0} total={3} />\n",
      })
    ).join("\n"),
    /blueprint-slice-progress/i,
  );
});
