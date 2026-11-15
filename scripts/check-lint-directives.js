import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, matchesGlob } from "node:path";
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
const files = execFileSync(
  "git",
  [
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--deduplicate",
  ],
  { encoding: "utf8" },
).split("\0");

for (const file of files) {
  if (
    !extensions.has(extname(file)) ||
    ignorePatterns.some((pattern) => matchesGlob(file, pattern)) ||
    !existsSync(file)
  ) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  const extension = extname(file);
  const lang = [".js", ".mjs", ".cjs"].includes(extension) ? "jsx" : undefined;
  const sourceType = extension === ".cjs" ? "commonjs" : undefined;
  const { comments, errors } = parseSync(file, source, { lang, sourceType });
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
