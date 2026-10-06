import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { assess } from "../chromatic-scope.js";

const script = fileURLToPath(new URL("../chromatic-scope.js", import.meta.url));

function run(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function repository(t) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "chromatic-scope-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  run(cwd, ["init", "-q"]);
  run(cwd, ["config", "user.email", "test@example.com"]);
  run(cwd, ["config", "user.name", "test"]);
  return cwd;
}

async function commit(cwd, files, message) {
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(cwd, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  run(cwd, ["add", "--all"]);
  run(cwd, ["commit", "-qm", message]);
  return run(cwd, ["rev-parse", "HEAD"]);
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
  workspaceGraph = "same",
  pnpmIntegrity = "sha512-pnpm",
} = {}) {
  const app = workspaceGraph === "changed" ? "2.0.0" : "1.0.0";
  const importers = `  .:\n    dependencies:\n      app-lib:\n        specifier: ^1.0.0\n        version: ${app}\n    devDependencies:\n      eslint:\n        specifier: ^9.0.0\n        version: ${eslint}\n    specifiers:\n      app-lib: ^1.0.0\n      eslint: ^9.0.0\n`;
  const packages = `  app-lib@${app}:\n    resolution: {integrity: sha512-app}\n  eslint@${eslint}:\n    resolution: {integrity: sha512-eslint-${eslint}}\n  color-lib@${color}:\n    resolution: {integrity: sha512-color-${color}}\n`;
  const snapshots = `${snapshot("app-lib", app, { "color-lib": malformed ? "8.0.0" : color })}${snapshot("eslint", eslint)}${snapshot("color-lib", color)}`;
  const packageManager = `lockfileVersion: '9.0'\nimporters:\n  .:\n    packageManagerDependencies:\n      pnpm:\n        specifier: 12.9.1\n        version: 12.9.1\npackages:\n  pnpm@12.9.1:\n    resolution: {integrity: ${pnpmIntegrity}}\nsnapshots:\n  pnpm@12.9.1:\n    resolution: {integrity: ${pnpmIntegrity}}\n`;
  const resolution = `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\noverrides: {}\nimporters:\n${importers}packages:\n${packages}snapshots:\n${snapshots}`;
  return `---\n${packageManager}---\n${resolution}`;
}

const manifest = (eslint = "^9.0.0") =>
  JSON.stringify({
    name: "fixture",
    dependencies: { "app-lib": "^1.0.0" },
    devDependencies: { eslint },
  });

async function commitsWithLock(
  t,
  firstLock,
  secondLock,
  firstManifest = manifest(),
  secondManifest = firstManifest,
) {
  const cwd = await repository(t);
  const base = await commit(
    cwd,
    { "package.json": firstManifest, "pnpm-lock.yaml": firstLock },
    "base",
  );
  const head = await commit(
    cwd,
    {
      "package.json": secondManifest,
      "pnpm-lock.yaml": secondLock,
      "docs/marker.md": "changed\n",
    },
    "head",
  );
  return { cwd, base, head };
}

test("skips documentation and Blueprint edits when protected dependency graph is unchanged", async (t) => {
  const cwd = await repository(t);
  const base = await commit(
    cwd,
    { "blueprint/content/features/example.md": "base\n" },
    "base",
  );
  const head = await commit(
    cwd,
    { "blueprint/content/features/example.md": "next\n" },
    "head",
  );
  assert.deepEqual(assess({ cwd, base, head }), {
    skip: true,
    reason: "changes are outside the visual dependency scope",
  });
});

test("skips an allowlisted devDependency-only manifest and lock update", async (t) => {
  const { cwd, base, head } = await commitsWithLock(
    t,
    lockfile(),
    lockfile({ eslint: "9.1.0" }),
    manifest(),
    manifest("^9.1.0"),
  );
  assert.equal(assess({ cwd, base, head }).skip, true);
});

test("runs when a shared transitive runtime dependency changes", async (t) => {
  const { cwd, base, head } = await commitsWithLock(
    t,
    lockfile(),
    lockfile({ color: "1.1.0" }),
  );
  assert.match(assess({ cwd, base, head }).reason, /dependency graph changed/);
});

test("runs when package manager metadata in the native first document changes", async (t) => {
  const { cwd, base, head } = await commitsWithLock(
    t,
    lockfile(),
    lockfile({ pnpmIntegrity: "sha512-updated-pnpm" }),
  );
  assert.equal(assess({ cwd, base, head }).skip, false);
});

test("runs for Storybook, CSS, and build tool changes", async (t) => {
  for (const filename of [
    ".storybook/preview.ts",
    "src/app.css",
    "tsconfig.json",
  ]) {
    const cwd = await repository(t);
    const base = await commit(cwd, { [filename]: "base\n" }, "base");
    const head = await commit(cwd, { [filename]: "head\n" }, "head");
    assert.equal(assess({ cwd, base, head }).skip, false, filename);
  }
});

test("fails closed for malformed lock content and dangling package references", async (t) => {
  const malformedYaml = await commitsWithLock(t, lockfile(), "not: [valid");
  assert.equal(assess(malformedYaml).skip, false);

  const dangling = await commitsWithLock(
    t,
    lockfile(),
    lockfile({ malformed: true }),
  );
  assert.equal(assess(dangling).skip, false);

  const unsupported = await commitsWithLock(
    t,
    lockfile(),
    lockfile().replaceAll("'9.0'", "'8.0'"),
  );
  assert.equal(assess(unsupported).skip, false);

  const extraDocument = await commitsWithLock(
    t,
    lockfile(),
    `${lockfile()}---\nunsupported: true\n`,
  );
  assert.equal(assess(extraDocument).skip, false);
});

test("fails closed for malformed and missing refs, while --force always runs", async (t) => {
  const { cwd, base, head } = await commitsWithLock(t, lockfile(), lockfile());
  assert.equal(assess({ cwd, base: "main", head }).skip, false);
  assert.equal(assess({ cwd, base, head: "f".repeat(40) }).skip, false);
  assert.equal(assess({ cwd, force: true }).skip, false);

  const outputFile = path.join(cwd, "github-output");
  const stdout = execFileSync(process.execPath, [script, "--force"], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GITHUB_OUTPUT: outputFile },
  });
  assert.match(stdout, /skip=false reason=forced/);
  assert.equal(await readFile(outputFile, "utf8"), "skip=false\n");
});

test("runs when a visual file is renamed or deleted", async (t) => {
  for (const change of ["rename", "delete"]) {
    const cwd = await repository(t);
    const base = await commit(cwd, { "src/old.tsx": "component\n" }, "base");
    if (change === "rename") {
      run(cwd, ["mv", "src/old.tsx", "src/new.tsx"]);
    } else {
      run(cwd, ["rm", "src/old.tsx"]);
    }
    run(cwd, ["add", "--all"]);
    run(cwd, ["commit", "-qm", change]);
    const head = run(cwd, ["rev-parse", "HEAD"]);
    assert.equal(assess({ cwd, base, head }).skip, false, change);
  }
});
