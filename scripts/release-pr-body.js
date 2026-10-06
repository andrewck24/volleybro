#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { fromMarkdown } from "mdast-util-from-markdown";

export const MAX_GITHUB_PR_BODY_CHARS = 60_000;

function textContent(node) {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(textContent).join("");
}

function versionOf(heading) {
  return textContent(heading)
    .trim()
    .match(/^(\d+\.\d+\.\d+(?:-[\da-z.-]+)?)(?:\s|$)/i)?.[1];
}

export function changelogEntryForVersion(changelog, version) {
  const headings = fromMarkdown(changelog).children.filter(
    (node) => node.type === "heading" && node.depth === 2,
  );
  const index = headings.findIndex((heading) => versionOf(heading) === version);
  if (index === -1) {
    throw new Error(`CHANGELOG.md has no version heading for ${version}`);
  }

  const heading = headings[index];
  const nextHeading = headings[index + 1];
  const entry = changelog
    .slice(heading.position.end.offset, nextHeading?.position.start.offset)
    .trim();
  if (!entry) throw new Error(`CHANGELOG.md has an empty entry for ${version}`);
  return entry;
}

export function buildReleasePrBody({ packageName, version, changelog }) {
  const entry = changelogEntryForVersion(changelog, version);
  const body = [
    "This Changesets version PR contains the release notes accumulated on `main` for this candidate. Review them before merging; the normal production-release authorization and QA gates still apply.",
    "",
    "# Releases",
    "",
    `## ${packageName}@${version}`,
    "",
    entry,
    "",
  ].join("\n");

  if (body.length > MAX_GITHUB_PR_BODY_CHARS) {
    throw new Error(
      `Release notes for ${packageName}@${version} exceed GitHub's ${MAX_GITHUB_PR_BODY_CHARS}-character PR body limit`,
    );
  }
  return body;
}

async function main() {
  const [{ name: packageName, version }, changelog] = await Promise.all([
    readFile("package.json", "utf8").then(JSON.parse),
    readFile("CHANGELOG.md", "utf8"),
  ]);
  process.stdout.write(buildReleasePrBody({ packageName, version, changelog }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
