import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkWorkflow } from "./check-workflow.mjs";

const validWorkflow = `---
delivery:
  version: 1
  capabilities:
    sdd:
      adapter: spectra
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
      adapter: spectra
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
    ...overrides,
  };

  for (const [relativePath, content] of Object.entries(files)) {
    if (content === null) continue;
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }

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
    "adapter: spectra",
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
