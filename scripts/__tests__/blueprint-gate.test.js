import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { previewUrl, runGate } from "../blueprint-gate.js";

const execFileAsync = promisify(execFile);

const git = (cwd) => (args) => execFileAsync("git", args, { cwd });

const page = (review) =>
  `---\ntitle: gamma\n---\n\nexport const scenarios = [\n  { id: "S1", given: "a", when: "b", then: "c" },\n];\n\n<ChangeTabs>\n<Proposal>\nThe proposal.\n</Proposal>\n${review ? "<Review>\n<ActionItems>無</ActionItems>\n</Review>\n" : ""}</ChangeTabs>\n`;

// One bare remote serves both the Change branch and the page store, the way
// origin does in the repository.
async function makeGateRepository(t, { review = false } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "blueprint-gate-"));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const bare = path.join(tmp, "origin.git");
  const work = path.join(tmp, "work");
  await execFileAsync("git", ["init", "-q", "--bare", "-b", "dev", bare]);
  await mkdir(work);
  const workGit = git(work);
  await workGit(["init", "-q", "-b", "dev"]);
  await workGit(["config", "user.email", "test@example.com"]);
  await workGit(["config", "user.name", "Test"]);
  await workGit(["remote", "add", "origin", bare]);
  await writeFile(path.join(work, "README.md"), "init\n");
  await workGit(["add", "-A"]);
  await workGit(["commit", "-q", "-m", "init"]);
  await workGit(["push", "-q", "origin", "dev"]);
  await workGit(["checkout", "-q", "-b", "feat/gamma"]);
  await writeFile(path.join(work, "a.txt"), "a\n");
  await workGit(["add", "-A"]);
  await workGit(["commit", "-q", "-m", "feat: add a"]);
  await workGit(["push", "-q", "-u", "origin", "feat/gamma"]);

  const dir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.mdx"), page(review));
  return { bare, work, workGit };
}

async function storeLog(bare) {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--format=%H", "blueprint-changes", "--", "gamma/index.mdx"],
    { cwd: bare },
  );
  return stdout.trim().split("\n").filter(Boolean);
}

async function storeFile(bare, rev, file) {
  const { stdout } = await execFileAsync(
    "git",
    ["show", `${rev}:gamma/${file}`],
    { cwd: bare },
  );
  return stdout;
}

const quiet = (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
};

test("the gate refuses a branch ahead of its upstream before publishing", async (t) => {
  const { bare, work, workGit } = await makeGateRepository(t);
  await writeFile(path.join(work, "b.txt"), "b\n");
  await workGit(["add", "b.txt"]);
  await workGit(["commit", "-q", "-m", "feat: add b"]);
  quiet(t);

  await runGate(work, "gamma", { runCheck: async () => true });

  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
  await assert.rejects(storeLog(bare));
});

test("the gate publishes, runs the check, and names the preview to compare", async (t) => {
  const { bare, work } = await makeGateRepository(t);
  const checked = [];
  quiet(t);

  await runGate(work, "gamma", {
    runCheck: async (slug) => {
      checked.push(slug);
      return true;
    },
  });

  assert.equal((await storeLog(bare)).length, 1);
  assert.deepEqual(checked, ["gamma"]);
  const printed = console.log.mock.calls.map((call) => call.arguments[0]);
  assert.ok(
    printed.some((line) =>
      line.includes(
        "https://feat-gamma-volleybro-blueprint.andrewck24.workers.dev/changes/gamma",
      ),
    ),
  );
  assert.ok(printed.some((line) => /1 commits?/.test(line)));
});

test("--gate G1 publishes the Proposal alone before the whole page", async (t) => {
  const { bare, work } = await makeGateRepository(t, { review: true });
  quiet(t);

  await runGate(work, "gamma", {
    g1: true,
    runCheck: async () => true,
  });

  const [whole, proposalOnly] = await storeLog(bare);
  assert.doesNotMatch(
    await storeFile(bare, proposalOnly, "index.mdx"),
    /<Review>/,
  );
  assert.equal(
    JSON.parse(await storeFile(bare, proposalOnly, "facts.json")).gate,
    "G1",
  );
  assert.match(await storeFile(bare, whole, "index.mdx"), /<Review>/);
});

test("a preview URL folds the branch name into one DNS label", () => {
  assert.equal(
    previewUrl("hotfix/single-page-change-leftovers", "x"),
    "https://hotfix-single-page-change-leftovers-volleybro-blueprint.andrewck24.workers.dev/changes/x",
  );
});
