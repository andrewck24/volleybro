#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse, parseAllDocuments } from "yaml";

const NON_VISUAL_DEV_DEPENDENCIES = new Set([
  "husky",
  "lint-staged",
  "@commitlint/cli",
  "@commitlint/config-conventional",
  "eslint",
  "@eslint/js",
  "eslint-config-next",
  "eslint-plugin-import",
  "eslint-plugin-react",
  "eslint-plugin-react-hooks",
  "eslint-plugin-storybook",
  "prettier",
  "prettier-plugin-tailwindcss",
  "knip",
  "jest",
  "jest-environment-jsdom",
  "@jest/globals",
  "@jest/types",
  "@testing-library/dom",
  "@testing-library/jest-dom",
  "@testing-library/react",
  "@testing-library/user-event",
  "mongodb-memory-server",
]);

const SAFE_PATHS = [
  /^docs\//,
  /^blueprint\//,
  /^\.(?:agents|claude|codex|impeccable|diagram-design)\//,
  /^(?:AGENTS|CLAUDE|WORKFLOW|CONTRIBUTING|CODING_STANDARDS|CONTEXT|PRODUCT|DESIGN|GLOSSARY|CHANGELOG|README(?:\.[^/]+)?)\.md$/,
  /^\.changeset\//,
  // The classifier and its workflow must still run when they change.
  /^scripts\/(?!chromatic-scope\.js$)/,
  /^\.github\/(?!workflows\/chromatic\.yml$)/,
  // Storybook loads src/**/*.stories and never imports tests or test/.
  /^test\//,
  /^src\/(?:.*\/__tests__\/|.*\.test\.[jt]sx?$)/,
  /^(?:jest\.config\.ts|knip\.json|\.nvmrc|components\.json|commitlint\.title\.config\.js|\.markdownlint\.jsonc|vercel\.json|\.gitignore|\.worktreeinclude|\.env\.example|skills-lock\.json|LICENSE)$/,
  /^\.eslintrc(?:\.[^/]+)?$/,
  /^eslint\.config\.[^/]+$/,
  /^\.prettier(?:rc(?:\.[^/]+)?|ignore)$/,
  /^prettier\.config\.[^/]+$/,
  /^\.commitlintrc(?:\.[^/]+)?$/,
  /^commitlint\.config\.[^/]+$/,
  /^\.lintstagedrc(?:\.[^/]+)?$/,
  /^lint-staged\.config\.[^/]+$/,
  /^\.husky\//,
];

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function stable(value) {
  return JSON.stringify(canonical(value));
}

function parseLockfile(content) {
  const docs = parseAllDocuments(content, { uniqueKeys: true });
  if (
    docs.length < 1 ||
    docs.length > 2 ||
    docs.some((doc) => doc.errors.length)
  ) {
    throw new Error("invalid pnpm lockfile YAML");
  }
  const locks = docs.map((doc) => doc.toJSON());
  if (locks.some((lock) => !lock || typeof lock !== "object")) {
    throw new Error("lockfile document is not a mapping");
  }
  const [first, ...rest] = locks;
  if (first.lockfileVersion !== "9.0") {
    throw new Error(
      `unsupported lockfileVersion: ${first.lockfileVersion ?? "missing"}`,
    );
  }
  for (const lock of rest) {
    if (lock.lockfileVersion !== first.lockfileVersion) {
      throw new Error("lockfile document environments differ");
    }
    for (const [key, value] of Object.entries(first)) {
      if (
        !["importers", "packages", "snapshots"].includes(key) &&
        Object.hasOwn(lock, key) &&
        stable(value) !== stable(lock[key])
      ) {
        throw new Error("lockfile document environments differ");
      }
    }
  }
  const lock = rest.length ? rest.at(-1) : first;
  const firstImporter = first.importers?.["."];
  const lockImporter = lock.importers?.["."];
  if (
    !firstImporter ||
    !lockImporter ||
    typeof firstImporter !== "object" ||
    typeof lockImporter !== "object" ||
    !lock.packages ||
    !lock.snapshots
  ) {
    throw new Error("lockfile is missing importer or package graph data");
  }
  for (const [key, value] of Object.entries(firstImporter)) {
    if (
      Object.hasOwn(lockImporter, key) &&
      stable(lockImporter[key]) !== stable(value)
    ) {
      throw new Error(`lockfile importer documents differ at ${key}`);
    }
  }
  const importer = { ...firstImporter, ...lockImporter };
  const resolutionEnvironment = Object.fromEntries(
    Object.entries(lock).filter(
      ([key]) => !["importers", "packages", "snapshots"].includes(key),
    ),
  );
  const environment = {
    firstDocument: first,
    resolutionEnvironment,
  };
  return {
    lock: { ...lock, importers: { ...lock.importers, ".": importer } },
    environment,
  };
}

function withoutPackageManager(importer) {
  const { packageManagerDependencies: _pin, ...rest } = importer;
  return rest;
}

function rootProtectedImporter(importer) {
  const result = withoutPackageManager(importer);
  const dev = { ...(result.devDependencies ?? {}) };
  const specifiers = { ...(result.specifiers ?? {}) };
  for (const name of NON_VISUAL_DEV_DEPENDENCIES) {
    if (
      Object.hasOwn(dev, name) &&
      !Object.hasOwn(importer.dependencies ?? {}, name) &&
      !Object.hasOwn(importer.optionalDependencies ?? {}, name)
    ) {
      delete dev[name];
      delete specifiers[name];
    }
  }
  result.devDependencies = dev;
  result.specifiers = specifiers;
  return result;
}

function packageLocator(name, reference, lock) {
  if (
    typeof reference !== "string" ||
    /^(?:link|file|workspace):/.test(reference)
  ) {
    throw new Error(`unsupported package reference for ${name}`);
  }
  if (Object.hasOwn(lock.snapshots, reference)) return reference;
  return `${name}@${reference}`;
}

function protectedGraph(lock) {
  const importer = lock.importers["."];
  const visited = new Set();
  const packages = {};
  const visit = (name, reference) => {
    const locator = packageLocator(name, reference, lock);
    if (visited.has(locator)) return;
    visited.add(locator);
    const snapshot = lock.snapshots[locator];
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error(`dangling package snapshot: ${locator}`);
    }
    const packageKey = locator.slice(
      0,
      locator.indexOf("(") === -1 ? undefined : locator.indexOf("("),
    );
    const metadata = lock.packages[packageKey];
    if (!metadata || typeof metadata !== "object") {
      throw new Error(`missing package metadata: ${packageKey}`);
    }
    packages[locator] = { metadata, snapshot };
    for (const section of ["dependencies", "optionalDependencies"]) {
      for (const [childName, childRef] of Object.entries(
        snapshot[section] ?? {},
      )) {
        visit(childName, childRef);
      }
    }
  };
  for (const section of [
    "dependencies",
    "optionalDependencies",
    "devDependencies",
  ]) {
    for (const [name, entry] of Object.entries(importer[section] ?? {})) {
      if (
        section === "devDependencies" &&
        NON_VISUAL_DEV_DEPENDENCIES.has(name)
      )
        continue;
      if (!entry || typeof entry.version !== "string") {
        throw new Error(`missing ${section} reference for ${name}`);
      }
      visit(name, entry.version);
    }
  }

  return { importer: rootProtectedImporter(importer), packages };
}

function packageName(locator) {
  const key = locator.split("(")[0];
  const at = key.lastIndexOf("@");
  if (at <= 0) throw new Error(`unrecognised package locator: ${locator}`);
  return key.slice(0, at);
}

function packagesByName(packages) {
  const byName = new Map();
  for (const [locator, entry] of Object.entries(packages)) {
    const name = packageName(locator);
    byName.set(name, [...(byName.get(name) ?? []), stable({ locator, entry })]);
  }
  for (const entries of byName.values()) entries.sort();
  return byName;
}

// Names of packages that changed version while the root dependencies and the
// set of package names stayed put; null when the change is anything wider.
function transitiveOnlyChanges(baseGraph, headGraph) {
  if (stable(baseGraph.importer) !== stable(headGraph.importer)) return null;
  const base = packagesByName(baseGraph.packages);
  const head = packagesByName(headGraph.packages);
  if (base.size !== head.size || [...base.keys()].some((n) => !head.has(n)))
    return null;
  const changed = [...base.keys()].filter(
    (name) => stable(base.get(name)) !== stable(head.get(name)),
  );
  return changed.length ? changed.sort() : null;
}

// Build tooling shapes Storybook output without showing up as bundled modules.
const TOOLCHAIN_PACKAGES = [
  /^react$/,
  /^react-dom$/,
  /^next$/,
  /^storybook$/,
  /^@storybook\//,
  /^tailwindcss$/,
  /^@tailwindcss\//,
  /^postcss(?:-|$)/,
  /^lightningcss(?:-|$)/,
  /^@swc\//,
  /^@babel\//,
  /^webpack$/,
  /^browserslist$/,
  /^caniuse-lite$/,
  /^autoprefixer$/,
];

const MAX_STATS_DEPTH = 8;

// Reads the stats as data only; any unexpected shape throws, and assess()
// treats that as "run the build".
function bundledPackages(statsPath) {
  const stats = JSON.parse(readFileSync(statsPath, "utf8"));
  const names = new Set();
  const visit = (modules, depth) => {
    if (!Array.isArray(modules)) throw new Error("stats modules is not a list");
    if (depth > MAX_STATS_DEPTH) throw new Error("stats modules nest too deep");
    for (const entry of modules) {
      if (!entry || typeof entry !== "object")
        throw new Error("stats module is not an object");
      for (const field of [entry.name, entry.identifier]) {
        if (typeof field !== "string") continue;
        for (const [, name] of field.matchAll(
          /node_modules\/((?:@[^/!?|]+\/)?[^/!?|.@][^/!?|]*)\//g,
        ))
          names.add(name);
      }
      if (entry.modules !== undefined) visit(entry.modules, depth + 1);
    }
  };
  visit(stats?.modules, 0);
  return names;
}

// Known metadata that cannot change what Storybook bundles. Any other field,
// including unknown ones, is compared so the check stays fail-closed.
const IGNORED_MANIFEST_FIELDS = [
  "name",
  "version",
  "private",
  "description",
  "keywords",
  "author",
  "contributors",
  "license",
  "repository",
  "homepage",
  "bugs",
  "funding",
  "scripts",
  "packageManager",
  "engines",
];

function parseManifest(content) {
  const manifest = JSON.parse(content);
  if (!manifest || typeof manifest !== "object" || !manifest.dependencies) {
    throw new Error("invalid root package manifest");
  }
  const filtered = { ...manifest, devDependencies: {} };
  for (const field of IGNORED_MANIFEST_FIELDS) delete filtered[field];
  for (const [name, version] of Object.entries(
    manifest.devDependencies ?? {},
  )) {
    if (!NON_VISUAL_DEV_DEPENDENCIES.has(name))
      filtered.devDependencies[name] = version;
  }
  return stable(filtered);
}

// The first lockfile document pins the package manager itself. The pin is not
// bundled; the graph beside it moves with the pin, so it is compared apart.
function lockEnvironment({ firstDocument, resolutionEnvironment }) {
  const { packages, snapshots, ...document } = firstDocument;
  return {
    pin: stable(firstDocument.importers?.["."]?.packageManagerDependencies),
    pinGraph: stable({ packages, snapshots }),
    rest: stable({
      firstDocument: {
        ...document,
        importers: {
          ...document.importers,
          ".": withoutPackageManager(document.importers?.["."] ?? {}),
        },
      },
      resolutionEnvironment,
    }),
  };
}

function parseNameStatus(output) {
  const fields = output.split("\0").filter(Boolean);
  const paths = [];
  for (let i = 0; i < fields.length;) {
    const status = fields[i++];
    if (/^[RC]/.test(status)) {
      paths.push(fields[i++], fields[i++]);
    } else {
      paths.push(fields[i++]);
    }
  }
  if (paths.some((file) => !file))
    throw new Error("malformed git name-status output");
  return paths;
}

function isSafePath(file) {
  return SAFE_PATHS.some((pattern) => pattern.test(file));
}

const CHROMATIC_WORKFLOW = ".github/workflows/chromatic.yml";

function isChromaticAction(uses) {
  return uses
    .replace(/^["']|["']$/g, "")
    .toLowerCase()
    .startsWith("chromaui/action@");
}

// Reduces every non-Chromatic step's `uses` to its action name, so two
// workflows that differ only in pins, comments or formatting compare equal.
function withoutActionPins(workflow) {
  const document = parse(workflow, { uniqueKeys: true });
  for (const job of Object.values(document?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.uses === "string" && !isChromaticAction(step.uses)) {
        step.uses = step.uses.split("@")[0];
      }
    }
  }
  return stable(document);
}

// An unparseable workflow throws, and assess() treats that as "run the build".
function isActionPinOnly(base, head, cwd) {
  const workflowAt = (sha) =>
    withoutActionPins(runGit(["show", `${sha}:${CHROMATIC_WORKFLOW}`], cwd));
  return workflowAt(base) === workflowAt(head);
}

function runGit(args, cwd) {
  return execFileSync("git", args, {
    maxBuffer: 16 * 1024 * 1024,
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assess({ base: target, head, stats, force = false }) {
  const cwd = process.cwd();
  if (force) return { skip: false, reason: "forced by --force" };
  if (
    !target ||
    !head ||
    !/^[0-9a-f]{7,40}$/i.test(target) ||
    !/^[0-9a-f]{7,40}$/i.test(head)
  ) {
    return { skip: false, reason: "base/head SHA is missing or malformed" };
  }
  try {
    // Commits that landed on the target after the branch point are not PR changes.
    const base = runGit(["merge-base", target, head], cwd).trim();
    const paths = parseNameStatus(
      runGit(["diff", "--name-status", "-z", base, head], cwd),
    );
    if (paths.length === 0) return { skip: true, reason: "no changed files" };
    const unknown = paths.filter(
      (file) =>
        !isSafePath(file) &&
        !["package.json", "pnpm-lock.yaml"].includes(file) &&
        !(file === CHROMATIC_WORKFLOW && isActionPinOnly(base, head, cwd)),
    );
    if (unknown.length)
      return {
        skip: false,
        reason: `visual or unclassified changes: ${unknown.slice(0, 4).join(", ")}`,
      };

    if (paths.includes("package.json") || paths.includes("pnpm-lock.yaml")) {
      const manifestAt = (sha) => runGit(["show", `${sha}:package.json`], cwd);
      const lockAt = (sha) => runGit(["show", `${sha}:pnpm-lock.yaml`], cwd);
      const baseManifest = parseManifest(manifestAt(base));
      const headManifest = parseManifest(manifestAt(head));
      const baseLock = parseLockfile(lockAt(base));
      const headLock = parseLockfile(lockAt(head));
      const baseEnvironment = lockEnvironment(baseLock.environment);
      const headEnvironment = lockEnvironment(headLock.environment);
      const isPinChanged = baseEnvironment.pin !== headEnvironment.pin;
      if (
        baseEnvironment.rest !== headEnvironment.rest ||
        (!isPinChanged && baseEnvironment.pinGraph !== headEnvironment.pinGraph)
      ) {
        return { skip: false, reason: "pnpm lockfile environment changed" };
      }
      if (baseManifest !== headManifest)
        return { skip: false, reason: "protected package manifest changed" };
      const baseGraph = protectedGraph(baseLock.lock);
      const headGraph = protectedGraph(headLock.lock);
      if (stable(baseGraph) !== stable(headGraph)) {
        const changed = transitiveOnlyChanges(baseGraph, headGraph);
        if (!changed)
          return { skip: false, reason: "protected dependency graph changed" };
        const listed = changed.slice(0, 4).join(", ");
        if (!stats)
          return {
            skip: false,
            needsStats: true,
            reason: `transitive dependency changes need Storybook stats: ${listed}`,
          };
        const bundled = bundledPackages(stats);
        const reached = changed.filter(
          (name) =>
            bundled.has(name) ||
            TOOLCHAIN_PACKAGES.some((pattern) => pattern.test(name)),
        );
        if (reached.length)
          return {
            skip: false,
            reason: `changed packages reach the Storybook build: ${reached.slice(0, 4).join(", ")}`,
          };
        return {
          skip: true,
          reason: `changed transitive packages stay out of the Storybook build: ${listed}`,
        };
      }
    }
    return {
      skip: true,
      reason: "changes are outside the visual dependency scope",
    };
  } catch (error) {
    return {
      skip: false,
      reason: `unable to classify safely: ${error.message.split("\n")[0]}`,
    };
  }
}

function argsFrom(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--base") args.base = argv[++i];
    else if (argv[i] === "--head") args.head = argv[++i];
    else if (argv[i] === "--stats") args.stats = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}

async function main() {
  let result;
  try {
    result = assess(argsFrom(process.argv.slice(2)));
  } catch (error) {
    result = { skip: false, reason: error.message };
  }
  const line = `skip=${result.skip}\n`;
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `${line}needs_stats=${Boolean(result.needsStats)}\n`,
    );
  console.log(`${line.trim()} reason=${result.reason}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
