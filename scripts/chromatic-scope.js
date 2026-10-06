#!/usr/bin/env node

import { appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAllDocuments } from "yaml";

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
  /^(?:AGENTS|CLAUDE|WORKFLOW|CONTRIBUTING|CODING_STANDARDS|CONTEXT|PRODUCT|DESIGN|CHANGELOG|README(?:\.[^/]+)?)\.md$/,
  /^\.changeset\//,
  // The classifier and its workflow must still run when they change.
  /^scripts\/(?!chromatic-scope\.js$)/,
  /^\.github\/(?!workflows\/chromatic\.yml$)/,
  // Storybook loads src/**/*.stories and never imports tests or test/.
  /^test\//,
  /^src\/(?:.*\/__tests__\/|.*\.test\.[jt]sx?$)/,
  /^(?:jest\.config\.ts|knip\.json|commitlint\.title\.config\.js|\.markdownlint\.jsonc|vercel\.json|\.gitignore|\.worktreeinclude|\.env\.example|skills-lock\.json|LICENSE)$/,
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

function rootProtectedImporter(importer) {
  const result = { ...importer };
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
  if (typeof reference !== "string" || reference.startsWith("link:")) {
    throw new Error(`unsupported or missing package reference for ${name}`);
  }
  if (reference.startsWith("file:") || reference.startsWith("workspace:")) {
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

  return stable({
    environment: lock.lockfileVersion,
    importer: rootProtectedImporter(importer),
    packages,
  });
}

function parseManifest(content) {
  const manifest = JSON.parse(content);
  if (!manifest || typeof manifest !== "object" || !manifest.dependencies) {
    throw new Error("invalid root package manifest");
  }
  const filtered = {
    ...manifest,
    devDependencies: {},
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies ?? {},
  };
  for (const [name, version] of Object.entries(
    manifest.devDependencies ?? {},
  )) {
    if (!NON_VISUAL_DEV_DEPENDENCIES.has(name))
      filtered.devDependencies[name] = version;
  }
  return stable(filtered);
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

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assess({ base, head, force = false }) {
  const cwd = process.cwd();
  if (force) return { skip: false, reason: "forced by --force" };
  if (
    !base ||
    !head ||
    !/^[0-9a-f]{7,40}$/i.test(base) ||
    !/^[0-9a-f]{7,40}$/i.test(head)
  ) {
    return { skip: false, reason: "base/head SHA is missing or malformed" };
  }
  try {
    runGit(["cat-file", "-e", `${base}^{commit}`], cwd);
    runGit(["cat-file", "-e", `${head}^{commit}`], cwd);
    const paths = parseNameStatus(
      runGit(["diff", "--name-status", "-z", base, head], cwd),
    );
    if (paths.length === 0) return { skip: true, reason: "no changed files" };
    const unknown = paths.filter(
      (file) =>
        !isSafePath(file) && !["package.json", "pnpm-lock.yaml"].includes(file),
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
      if (stable(baseLock.environment) !== stable(headLock.environment)) {
        return { skip: false, reason: "pnpm lockfile environment changed" };
      }
      if (baseManifest !== headManifest)
        return { skip: false, reason: "protected package manifest changed" };
      if (protectedGraph(baseLock.lock) !== protectedGraph(headLock.lock)) {
        return { skip: false, reason: "protected dependency graph changed" };
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
    await appendFile(process.env.GITHUB_OUTPUT, line);
  console.log(`${line.trim()} reason=${result.reason}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
