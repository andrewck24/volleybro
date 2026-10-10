import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { checkDesignDocument } from "../design-document.js";
import { designSections } from "../../blueprint/src/lib/design-sections.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));
const source = await readFile(path.join(root, "DESIGN.md"), "utf8");
const css = await readFile(path.join(root, "src/app/globals.css"), "utf8");

async function designFixture(t) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "design-document-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  await mkdir(path.join(temp, "src/app"), { recursive: true });
  await writeFile(path.join(temp, "src/app/globals.css"), css);
  await writeFile(path.join(temp, "DESIGN.md"), source);
  return temp;
}

test("the normative light/dark palette agrees with resolved runtime tokens", async (t) => {
  const temp = await designFixture(t);
  await checkDesignDocument(temp, { write: true });
  await checkDesignDocument(temp);
  for (const key of ["primary", "dark-primary-text"]) {
    await writeFile(
      path.join(temp, "DESIGN.md"),
      source.replace(new RegExp(`^  ${key}: .+$`, "m"), `  ${key}: "#fff"`),
    );
    await assert.rejects(checkDesignDocument(temp), new RegExp(key));
  }
  await writeFile(
    path.join(temp, "DESIGN.md"),
    source.replace(/^  dark-primary-text: .+\n/m, ""),
  );
  await assert.rejects(checkDesignDocument(temp), /dark-primary-text/);
});

test("a sidecar becomes stale when its authoritative motion extension changes", async (t) => {
  const temp = await designFixture(t);
  await assert.rejects(checkDesignDocument(temp), /Missing or invalid/);
  await checkDesignDocument(temp, { write: true });
  await checkDesignDocument(temp);
  await writeFile(
    path.join(temp, "DESIGN.md"),
    source.replace("value: 500ms", "value: 750ms"),
  );
  await assert.rejects(checkDesignDocument(temp), /stale/);
  await checkDesignDocument(temp, { write: true });
  const sidecar = JSON.parse(
    await readFile(path.join(temp, ".impeccable/design.json"), "utf8"),
  );
  assert.equal(sidecar.extensions.motion[0].value, "750ms");
  await checkDesignDocument(temp);
});

test("section routing preserves fenced examples and each chapter's content", () => {
  const tree = fromMarkdown(
    "# Title\n\n## Overview\n\nIntro.\n\n```md\n## Not a section\n```\n\n## Colors\n\nPalette.\n",
  );
  designSections()(tree);
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].attributes[0].value, "Overview");
  assert.equal(
    tree.children[0].children.find((n) => n.type === "code").value,
    "## Not a section",
  );
  assert.equal(tree.children[1].attributes[0].value, "Colors");
  assert.equal(tree.children[1].children.at(-1).children[0].value, "Palette.");
});
