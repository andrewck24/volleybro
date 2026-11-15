import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, matchesGlob, relative } from "node:path";
import { parseSync } from "oxc-parser";

const { ignorePatterns } = JSON.parse(
  readFileSync(new URL("../.oxlintrc.pilot.json", import.meta.url), "utf8"),
);
const extensions = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
]);
const paths = process.argv.slice(2);
const files = paths.length
  ? paths
  : execFileSync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      {
        encoding: "utf8",
      },
    ).split("\0");

for (const file of new Set(
  files.map((path) => relative(process.cwd(), path)),
)) {
  if (
    !extensions.has(extname(file)) ||
    ignorePatterns.some((pattern) => matchesGlob(file, pattern)) ||
    !existsSync(file)
  ) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  const extension = extname(file);
  const lang = extension === ".js" || extension === ".mjs" ? "jsx" : undefined;
  const { comments, errors } = parseSync(file, source, { lang });
  if (errors.length > 0) {
    console.error(`${file}: Unable to check inline lint directives.`);
    process.exitCode = 1;
  }
  for (const comment of comments) {
    if (!/^\s*(?:oxlint|eslint)-(?:disable|enable)\b/.test(comment.value))
      continue;
    const line = source.slice(0, comment.start).split("\n").length;
    console.error(`${file}:${line}: Inline lint directives are not allowed.`);
    process.exitCode = 1;
  }
}
