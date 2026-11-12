import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  commitFiles,
  git,
  initRepository,
} from "../../test/support/git-fixture.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const entry = "scripts/release-controls.js";
const moduleDir = "scripts/release-controls";
const BARE_DIRECTORY_REASON =
  "The release runs the controller from a bare temp directory with no node_modules and no package.json, and a job that reaches a missing module must fail before production is touched. Controller modules may only use static imports of node: builtins or files inside the module directory.";

const jobs = parseYaml(
  await readFile(
    path.join(root, ".github/workflows/production-release.yml"),
    "utf8",
  ),
).jobs;
const steps = Object.values(jobs).flatMap((job) => job.steps);
const extraction = steps.find((step) => step.id === "controller");
const upload = steps.find(
  (step) =>
    step.uses?.startsWith("actions/upload-artifact") &&
    step.with.name === "trusted-release-controller",
);

const moduleFiles = (await readdir(path.join(root, moduleDir))).map(
  (name) => `${moduleDir}/${name}`,
);

async function controllerFiles(marker, names = [entry, ...moduleFiles]) {
  const files = {};
  for (const name of names)
    files[name] =
      `${await readFile(path.join(root, name), "utf8")}// marker: ${marker}\n`;
  return files;
}

async function repository(t) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "release-trust-repo-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  initRepository(cwd);
  return cwd;
}

async function versionMerge(t, trustedNames) {
  const cwd = await repository(t);
  const trusted = await commitFiles(
    cwd,
    await controllerFiles("trusted", trustedNames),
    "trusted",
  );
  git(cwd, "checkout", "--quiet", "-b", "candidate");
  await commitFiles(cwd, await controllerFiles("candidate"), "candidate");
  git(cwd, "checkout", "--quiet", "main");
  git(cwd, "merge", "--quiet", "--no-ff", "-m", "merge", "candidate");
  return { cwd, trusted };
}

async function runExtraction(t, cwd, env) {
  const runnerTemp = await mkdtemp(
    path.join(os.tmpdir(), "release-trust-run-"),
  );
  t.after(() => rm(runnerTemp, { recursive: true, force: true }));
  const script = path.join(runnerTemp, "step.sh");
  const output = path.join(runnerTemp, "github-output");
  await writeFile(script, extraction.run);
  await writeFile(output, "");
  const result = spawnSync("bash", ["-e", script], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      RUNNER_TEMP: runnerTemp,
      GITHUB_OUTPUT: output,
    },
  });
  return { result, runnerTemp, output: await readFile(output, "utf8") };
}

async function assertExtractedMarker(runnerTemp, marker) {
  const names = [
    "release-controls.js",
    ...moduleFiles.map((name) => name.slice("scripts/".length)),
  ];
  for (const name of names)
    assert.match(
      await readFile(path.join(runnerTemp, name), "utf8"),
      new RegExp(`// marker: ${marker}\\n$`),
      name,
    );
}

async function dirtyWorkspace(cwd) {
  const files = await controllerFiles("workspace");
  for (const [name, content] of Object.entries(files))
    await writeFile(path.join(cwd, name), content);
}

test("a push takes the controller from the first parent, not from the candidate", async (t) => {
  const { cwd, trusted } = await versionMerge(t);
  await dirtyWorkspace(cwd);
  const { result, runnerTemp, output } = await runExtraction(t, cwd, {
    EVENT_NAME: "push",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(output, new RegExp(`controller_sha=${trusted}\\n`));
  await assertExtractedMarker(runnerTemp, "trusted");
});

test("a dispatch takes the controller from the dispatched commit", async (t) => {
  const cwd = await repository(t);
  const dispatched = await commitFiles(
    cwd,
    await controllerFiles("dispatched"),
    "dispatched",
  );
  await dirtyWorkspace(cwd);
  const { result, runnerTemp, output } = await runExtraction(t, cwd, {
    EVENT_NAME: "workflow_dispatch",
    DISPATCH_MODE: "normal-retry",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(output, new RegExp(`controller_sha=${dispatched}\\n`));
  assert.match(output, /mode=normal-retry\n/);
  await assertExtractedMarker(runnerTemp, "dispatched");
  const recover = await runExtraction(t, cwd, {
    EVENT_NAME: "workflow_dispatch",
    DISPATCH_MODE: "recover",
  });
  assert.notEqual(recover.result.status, 0);
  assert.match(recover.result.stderr, /Unsupported release mode/);
});

test("extraction fails the step when the trusted commit lacks the module directory", async (t) => {
  const { cwd } = await versionMerge(t, [entry]);
  const { result } = await runExtraction(t, cwd, { EVENT_NAME: "push" });
  assert.notEqual(result.status, 0);
});

test("the uploaded artifact runs from the bare directories the jobs download it to", async (t) => {
  const { cwd } = await versionMerge(t);
  const { result, runnerTemp } = await runExtraction(t, cwd, {
    EVENT_NAME: "push",
  });
  assert.equal(result.status, 0, result.stderr);
  const bare = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "release-trust-bare-")),
  );
  t.after(() => rm(bare, { recursive: true, force: true }));
  const uploaded = upload.with.path
    .trim()
    .split("\n")
    .map((line) => line.trim().replace("${{ runner.temp }}/", ""));
  const trusted = path.join(bare, "trusted");
  await mkdir(trusted);
  for (const target of [bare, trusted])
    for (const name of uploaded)
      await cp(path.join(runnerTemp, name), path.join(target, name), {
        recursive: true,
      });
  for (const target of [bare, trusted]) {
    const output = `${target}-github-output`;
    await writeFile(output, "");
    const run = spawnSync(
      process.execPath,
      [path.join(target, "release-controls.js"), "summarize-smoke"],
      {
        cwd: bare,
        encoding: "utf8",
        env: {
          ...process.env,
          SMOKE_REPORT_FILE: path.join(bare, "no-report.json"),
          GITHUB_OUTPUT: output,
        },
      },
    );
    assert.equal(run.status, 0, `${BARE_DIRECTORY_REASON}\n${run.stderr}`);
    assert.match(await readFile(output, "utf8"), /smoke_results/);
  }
});

test("the staged state artifact cannot overlay the controller it is read by", () => {
  const { steps: sourceQa } = jobs["source-qa"];
  const downloadPath = (name) =>
    sourceQa.find(
      (step) =>
        step.uses?.startsWith("actions/download-artifact") &&
        step.with.name === name,
    ).with.path;
  const stateDirectory = downloadPath("production-release-state");
  const controllerDirectory = downloadPath("trusted-release-controller");
  const controllerPaths = upload.with.path
    .trim()
    .split("\n")
    .map((line) =>
      path.posix.join(
        controllerDirectory,
        line.trim().replace("${{ runner.temp }}/", ""),
      ),
    );
  const trim = (p) => path.posix.normalize(p).replace(/\/+$/, "");
  const state = trim(stateDirectory);
  for (const controllerPath of controllerPaths) {
    const controller = trim(controllerPath);
    assert.ok(
      state !== controller &&
        !controller.startsWith(`${state}/`) &&
        !state.startsWith(`${controller}/`),
      `${stateDirectory} overlays the trusted controller at ${controllerPath}`,
    );
  }
  const stateFile = `${stateDirectory}/release-state.json`;
  for (const step of sourceQa.filter((step) => step.env?.RELEASE_STATE_FILE))
    assert.equal(step.env.RELEASE_STATE_FILE, stateFile);
  assert.equal(
    sourceQa.find((step) => step.uses?.startsWith("actions/upload-artifact"))
      .with.path,
    stateFile,
  );
});

test("controller modules only use static imports the bare directory can resolve", async () => {
  const directory = path.join(root, moduleDir);
  const entryFile = path.join(root, entry);
  for (const name of [entry, ...moduleFiles]) {
    const source = await readFile(path.join(root, name), "utf8");
    const file = path.join(root, name);
    assert.doesNotMatch(
      source,
      /\bimport\s*\(/,
      `${name} uses import(). ${BARE_DIRECTORY_REASON}`,
    );
    const specifiers = [
      ...source.matchAll(
        /^(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gm,
      ),
      ...source.matchAll(/^import\s+["']([^"']+)["']/gm),
    ].map((match) => match[1]);
    for (const specifier of specifiers) {
      if (specifier.startsWith("node:")) continue;
      const target = path.resolve(path.dirname(file), specifier);
      assert.ok(
        specifier.startsWith(".") &&
          target !== entryFile &&
          target.startsWith(`${directory}${path.sep}`),
        `${name} imports ${specifier}. ${BARE_DIRECTORY_REASON}`,
      );
    }
  }
});
