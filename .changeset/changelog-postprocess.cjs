#!/usr/bin/env node
// Run after `changeset version` (via the release:version script) to:
// 1. Fix version headers:  ## X.Y.Z  →  ## [X.Y.Z](compare-link) YYYY-MM-DD
// 2. Merge duplicate ### type headings within each version block

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO = "https://github.com/andrewck24/volleybro";
const CHANGELOG = path.resolve(__dirname, "../CHANGELOG.md");

function prevGitVersion(current) {
  try {
    return execSync("git tag --sort=-version:refname", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
      .map((t) => t.slice(1))
      .find((v) => v !== current) ?? null;
  } catch {
    return null;
  }
}

// Merge duplicate ### type sections and their ### domain sub-sections.
// Input: the body text below a ## version header.
// Output: reconstructed body with each type appearing exactly once.
function mergeSections(body) {
  // typeMap: Map<type, Map<domain|null, bullet[]>>
  const typeMap = new Map();
  const typeOrder = [];
  let curType = null;
  let curDomain = null;

  for (const line of body.split("\n")) {
    if (line.startsWith("### ")) {
      const type = line.slice(4).trim();
      if (!typeMap.has(type)) {
        typeMap.set(type, new Map());
        typeOrder.push(type);
      }
      curType = type;
      curDomain = null;
    } else if (line.startsWith("#### ") && curType) {
      curDomain = line.slice(5).trim();
      if (!typeMap.get(curType).has(curDomain)) {
        typeMap.get(curType).set(curDomain, []);
      }
    } else if (line.startsWith("- ") && curType) {
      const m = typeMap.get(curType);
      if (!m.has(curDomain)) m.set(curDomain, []);
      m.get(curDomain).push(line);
    }
  }

  const out = [];
  for (const type of typeOrder) {
    const totalBullets = [...typeMap.get(type).values()].reduce(
      (sum, b) => sum + b.length,
      0
    );
    // Skip empty sections — changesets injects ### Patch/Minor/Major Changes
    // wrapper headings that have no bullets when using a verbatim formatter.
    if (totalBullets === 0) continue;

    out.push(`### ${type}`, "");
    for (const [domain, bullets] of typeMap.get(type)) {
      if (domain !== null) out.push(`#### ${domain}`, "");
      out.push(...bullets, "");
    }
  }
  return out.join("\n").trimEnd();
}

const today = new Date().toISOString().slice(0, 10);
const cur = require("../package.json").version;
const prev = prevGitVersion(cur);

const content = fs.readFileSync(CHANGELOG, "utf-8");

// Split on version headers so each block can be processed independently.
// Blocks not starting with "## " (e.g. the "# packageName" title) pass through.
const blocks = content.split(/(?=^## )/m);

const result = blocks
  .map((block) => {
    const m = block.match(/^## (\d+\.\d+\.\d+)\s*\n/);
    if (!m) return block;

    const version = m[1];
    const body = block.slice(m[0].length);
    const link = prev
      ? `${REPO}/compare/v${prev}...v${version}`
      : `${REPO}/releases/tag/v${version}`;

    return `## [${version}](${link}) ${today}\n\n${mergeSections(body)}\n\n`;
  })
  .join("");

fs.writeFileSync(CHANGELOG, result.trimEnd() + "\n");
console.log(`CHANGELOG.md updated (v${cur})`);
