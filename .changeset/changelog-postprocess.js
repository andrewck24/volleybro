#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO = "https://github.com/andrewck24/volleybro";
const CHANGELOG = path.resolve(__dirname, "../CHANGELOG.md");

function prevChangelogVersion(content, current) {
  return (
    [...content.matchAll(/^## \[(\d+\.\d+\.\d+)\]\(/gm)]
      .map((m) => m[1])
      .find((v) => v !== current) ?? null
  );
}

function mergeSections(body) {
  const bulletsByTypeAndDomain = new Map();
  const typeOrder = [];
  let curType = null;
  let curDomain = null;

  for (const line of body.split("\n")) {
    if (line.startsWith("### ")) {
      const type = line.slice(4).trim();
      if (!bulletsByTypeAndDomain.has(type)) {
        bulletsByTypeAndDomain.set(type, new Map());
        typeOrder.push(type);
      }
      curType = type;
      curDomain = null;
    } else if (line.startsWith("#### ") && curType) {
      curDomain = line.slice(5).trim();
      if (!bulletsByTypeAndDomain.get(curType).has(curDomain)) {
        bulletsByTypeAndDomain.get(curType).set(curDomain, []);
      }
    } else if (line.startsWith("- ") && curType) {
      const m = bulletsByTypeAndDomain.get(curType);
      if (!m.has(curDomain)) m.set(curDomain, []);
      m.get(curDomain).push(line);
    }
  }

  const out = [];
  for (const type of typeOrder) {
    const totalBullets = [...bulletsByTypeAndDomain.get(type).values()].reduce(
      (sum, b) => sum + b.length,
      0,
    );
    if (totalBullets === 0) continue;

    out.push(`### ${type}`, "");
    for (const [domain, bullets] of bulletsByTypeAndDomain.get(type)) {
      if (domain !== null) out.push(`#### ${domain}`, "");
      out.push(...bullets, "");
    }
  }
  return out.join("\n").trimEnd();
}

const today = new Date().toISOString().slice(0, 10);
const cur = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
).version;
const content = fs.readFileSync(CHANGELOG, "utf-8");
const prev = prevChangelogVersion(content, cur);

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
