import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { parseAllDocuments } from "yaml";

import { commitFiles } from "../../test/support/git-fixture.js";

const script = fileURLToPath(new URL("../chromatic-scope.js", import.meta.url));
const repositoryRoot = path.dirname(
  fileURLToPath(new URL("../../package.json", import.meta.url)),
);

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function repository(t) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "chromatic-scope-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  git(cwd, "init", "-q");
  git(cwd, "config", "user.email", "test@example.com");
  git(cwd, "config", "user.name", "test");
  return cwd;
}

async function classify(cwd, args) {
  const outputFile = path.join(cwd, "github-output");
  await writeFile(outputFile, "");
  const stdout = execFileSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GITHUB_OUTPUT: outputFile },
  });
  return { stdout, output: await readFile(outputFile, "utf8") };
}

function compareArgs(base, head) {
  return ["--base", base, "--head", head];
}

function snapshot(name, version, dependencies = {}) {
  return `  ${JSON.stringify(`${name}@${version}`)}:\n${
    Object.keys(dependencies).length
      ? `    dependencies:\n${Object.entries(dependencies)
          .map(
            ([child, ref]) =>
              `      ${JSON.stringify(child)}: ${JSON.stringify(ref)}\n`,
          )
          .join("")}`
      : "    resolution: {integrity: sha512-example}\n"
  }`;
}

function lockfile({
  eslint = "9.0.0",
  color = "1.0.0",
  malformed = false,
  alias = false,
  pnpmIntegrity = "sha512-pnpm",
} = {}) {
  const importers = `  .:\n    dependencies:\n      app-lib:\n        specifier: ^1.0.0\n        version: 1.0.0\n${
    alias
      ? "      alias-lib:\n        specifier: npm:real-lib@^1.0.0\n        version: real-lib@1.0.0\n"
      : ""
  }    devDependencies:\n      eslint:\n        specifier: ^9.0.0\n        version: ${eslint}\n    specifiers:\n      app-lib: ^1.0.0\n      eslint: ^9.0.0\n${
    alias ? "      alias-lib: npm:real-lib@^1.0.0\n" : ""
  }`;
  const packages = `  app-lib@1.0.0:\n    resolution: {integrity: sha512-app}\n  eslint@${eslint}:\n    resolution: {integrity: sha512-eslint-${eslint}}\n  color-lib@${color}:\n    resolution: {integrity: sha512-color-${color}}\n${
    alias ? "  real-lib@1.0.0:\n    resolution: {integrity: sha512-real}\n" : ""
  }`;
  const snapshots = `${snapshot("app-lib", "1.0.0", {
    "color-lib": malformed ? "8.0.0" : color,
  })}${snapshot("eslint", eslint)}${snapshot("color-lib", color)}${
    alias ? snapshot("real-lib", "1.0.0") : ""
  }`;
  const packageManager = `lockfileVersion: '9.0'\nimporters:\n  .:\n    packageManagerDependencies:\n      pnpm:\n        specifier: 12.9.1\n        version: 12.9.1\npackages:\n  pnpm@12.9.1:\n    resolution: {integrity: ${pnpmIntegrity}}\nsnapshots:\n  pnpm@12.9.1:\n    resolution: {integrity: ${pnpmIntegrity}}\n`;
  const resolution = `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\noverrides: {}\nimporters:\n${importers}packages:\n${packages}snapshots:\n${snapshots}`;
  return `---\n${packageManager}---\n${resolution}`;
}

const manifest = (eslint = "^9.0.0", alias = false) =>
  JSON.stringify({
    name: "fixture",
    dependencies: {
      "app-lib": "^1.0.0",
      ...(alias ? { "alias-lib": "npm:real-lib@^1.0.0" } : {}),
    },
    devDependencies: { eslint },
  });

async function commitPair(t, baseFiles, headFiles) {
  const cwd = await repository(t);
  const base = await commitFiles(cwd, baseFiles, "base");
  const head = await commitFiles(cwd, headFiles, "head");
  return { cwd, base, head };
}

async function lockPair(
  t,
  firstLock,
  secondLock,
  firstManifest,
  secondManifest,
) {
  return commitPair(
    t,
    { "package.json": firstManifest, "pnpm-lock.yaml": firstLock },
    {
      "package.json": secondManifest,
      "pnpm-lock.yaml": secondLock,
      "docs/marker.md": "changed\n",
    },
  );
}

test("skips documentation and Blueprint edits when the graph is unchanged", async (t) => {
  const { cwd, base, head } = await commitPair(
    t,
    { "blueprint/content/features/example.md": "base\n" },
    { "blueprint/content/features/example.md": "next\n" },
  );
  const result = await classify(cwd, compareArgs(base, head));
  assert.match(result.stdout, /skip=true reason=/);
  assert.equal(result.output, "skip=true\n");
});

test("skips agent tooling and root prose docs but still runs when mixed with src", async (t) => {
  const skipped = {
    ".agents/skills/x/SKILL.md": "next\n",
    ".claude/launch.json": "{}\n",
    "AGENTS.md": "next\n",
    "README.zh-TW.md": "next\n",
  };
  for (const [files, skip] of [
    [skipped, true],
    [{ ...skipped, "src/Button.tsx": "next\n" }, false],
  ]) {
    const { cwd, base, head } = await commitPair(
      t,
      { "docs/a.md": "a\n" },
      files,
    );
    const result = await classify(cwd, compareArgs(base, head));
    assert.equal(result.output, `skip=${skip}\n`);
  }
});

test("skips an allowlisted devDependency-only update, including a real npm alias graph", async (t) => {
  const { cwd, base, head } = await lockPair(
    t,
    lockfile({ alias: true }),
    lockfile({ eslint: "9.1.0", alias: true }),
    manifest("^9.0.0", true),
    manifest("^9.1.0", true),
  );
  const result = await classify(cwd, compareArgs(base, head));
  assert.match(result.stdout, /skip=true reason=/);
  assert.equal(result.output, "skip=true\n");
});

test("skips a husky specifier-only change against the repository's full current lockfile", async (t) => {
  const packageText = await readFile(
    path.join(repositoryRoot, "package.json"),
    "utf8",
  );
  const lockText = await readFile(
    path.join(repositoryRoot, "pnpm-lock.yaml"),
    "utf8",
  );
  const packageData = JSON.parse(packageText);
  const documents = parseAllDocuments(lockText);
  const importer = documents
    .at(-1)
    .getIn(["importers", ".", "devDependencies", "husky"]);
  const resolved = importer.get("version");
  const nextSpecifier =
    packageData.devDependencies.husky === resolved ? `^${resolved}` : resolved;
  importer.set("specifier", nextSpecifier);
  packageData.devDependencies.husky = nextSpecifier;
  const nextLock = documents.map((document) => document.toString()).join("");
  const { cwd, base, head } = await commitPair(
    t,
    { "package.json": packageText, "pnpm-lock.yaml": lockText },
    {
      "package.json": `${JSON.stringify(packageData, null, 2)}\n`,
      "pnpm-lock.yaml": nextLock,
      "docs/marker.md": "changed\n",
    },
  );
  const result = await classify(cwd, compareArgs(base, head));
  assert.match(result.stdout, /skip=true reason=/);
  assert.equal(result.output, "skip=true\n");
});

test("runs when a shared transitive runtime dependency changes", async (t) => {
  const { cwd, base, head } = await lockPair(
    t,
    lockfile(),
    lockfile({ color: "1.1.0" }),
    manifest(),
    manifest(),
  );
  const result = await classify(cwd, compareArgs(base, head));
  assert.match(result.stdout, /skip=false reason=.*dependency graph changed/);
  assert.equal(result.output, "skip=false\n");
});

test("runs when native first-document package manager metadata changes", async (t) => {
  const { cwd, base, head } = await lockPair(
    t,
    lockfile(),
    lockfile({ pnpmIntegrity: "sha512-updated-pnpm" }),
    manifest(),
    manifest(),
  );
  const result = await classify(cwd, compareArgs(base, head));
  assert.match(result.stdout, /skip=false reason=/);
  assert.equal(result.output, "skip=false\n");
});

test("runs for Storybook, CSS, and build tool changes", async (t) => {
  for (const filename of [
    ".storybook/preview.ts",
    "src/app.css",
    "tsconfig.json",
  ]) {
    const { cwd, base, head } = await commitPair(
      t,
      { [filename]: "base\n" },
      { [filename]: "head\n" },
    );
    const result = await classify(cwd, compareArgs(base, head));
    assert.match(result.stdout, /skip=false reason=/, filename);
    assert.equal(result.output, "skip=false\n", filename);
  }
});

test("fails closed for malformed locks, dangling refs, unsupported versions, and extra documents", async (t) => {
  const invalidCases = [
    [lockfile(), "not: [valid"],
    [lockfile(), lockfile({ malformed: true })],
    [lockfile(), lockfile().replaceAll("'9.0'", "'8.0'")],
    [lockfile(), `${lockfile()}---\nunsupported: true\n`],
  ];
  for (const [firstLock, secondLock] of invalidCases) {
    const { cwd, base, head } = await lockPair(
      t,
      firstLock,
      secondLock,
      manifest(),
      manifest(),
    );
    const result = await classify(cwd, compareArgs(base, head));
    assert.match(result.stdout, /skip=false reason=/);
    assert.equal(result.output, "skip=false\n");
  }
});

test("fails closed for missing or malformed refs and --force writes skip=false", async (t) => {
  const { cwd, base, head } = await lockPair(
    t,
    lockfile(),
    lockfile({ eslint: "9.1.0" }),
    manifest(),
    manifest("^9.1.0"),
  );
  for (const args of [
    ["--head", head],
    ...[compareArgs("main", head), compareArgs(base, "f".repeat(40))],
  ]) {
    const result = await classify(cwd, args);
    assert.match(result.stdout, /skip=false reason=/);
    assert.equal(result.output, "skip=false\n");
  }
  const forced = await classify(cwd, ["--force"]);
  assert.match(forced.stdout, /skip=false reason=forced/);
  assert.equal(forced.output, "skip=false\n");
});

test("runs when a visual file is renamed or deleted", async (t) => {
  for (const change of ["rename", "delete"]) {
    const cwd = await repository(t);
    const base = await commitFiles(
      cwd,
      { "src/old.tsx": "component\n" },
      "base",
    );
    if (change === "rename") git(cwd, "mv", "src/old.tsx", "src/new.tsx");
    else git(cwd, "rm", "src/old.tsx");
    git(cwd, "add", "--all");
    git(cwd, "commit", "-qm", change);
    const head = git(cwd, "rev-parse", "HEAD");
    const result = await classify(cwd, compareArgs(base, head));
    assert.match(result.stdout, /skip=false reason=/, change);
    assert.equal(result.output, "skip=false\n", change);
  }
});
