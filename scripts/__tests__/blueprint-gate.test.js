import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { previewUrl, rebuildPreview, runGate } from "../blueprint-gate.js";

const execFileAsync = promisify(execFile);

const git = (cwd) => (args) => execFileAsync("git", args, { cwd });

const PAGE_FILES = {
  "index.mdx": "---\ntitle: gamma\n---\n",
  "proposal.mdx":
    'export const scenarios = [\n  { id: "S1", given: "a", when: "b", then: "c" },\n];\n\nThe proposal.\n',
};
const REVIEW_FILE = "<ActionItems>\n\n無\n\n</ActionItems>\n";
const noRebuild = async () => "rebuild skipped";

// One bare remote serves both the Change branch and the page store, the way
// origin does in the repository.
async function makeGateRepository(t, { review = false } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "blueprint-gate-"));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const bare = path.join(tmp, "origin.git");
  const work = path.join(tmp, "work");
  await execFileAsync("git", ["init", "-q", "--bare", "-b", "main", bare]);
  await mkdir(work);
  const workGit = git(work);
  await workGit(["init", "-q", "-b", "main"]);
  await workGit(["config", "user.email", "test@example.com"]);
  await workGit(["config", "user.name", "Test"]);
  await workGit(["remote", "add", "origin", bare]);
  await writeFile(path.join(work, "README.md"), "init\n");
  await workGit(["add", "-A"]);
  await workGit(["commit", "-q", "-m", "init"]);
  await workGit(["push", "-q", "origin", "main"]);
  await workGit(["checkout", "-q", "-b", "feat/gamma"]);
  await writeFile(path.join(work, "a.txt"), "a\n");
  await workGit(["add", "-A"]);
  await workGit(["commit", "-q", "-m", "feat: add a"]);
  await workGit(["push", "-q", "-u", "origin", "feat/gamma"]);

  const dir = path.join(work, "blueprint", "content", "changes", "gamma");
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(PAGE_FILES)) {
    await writeFile(path.join(dir, name), content);
  }
  if (review) await writeFile(path.join(dir, "review.mdx"), REVIEW_FILE);
  return { bare, work, workGit };
}

async function storeLog(bare) {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--format=%H", "blueprint-changes", "--", "gamma/facts.json"],
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
    rebuild: noRebuild,
  });

  assert.equal((await storeLog(bare)).length, 1);
  assert.deepEqual(checked, ["gamma"]);
  const messages = console.log.mock.calls
    .slice(-2)
    .map((call) => call.arguments[0]);
  assert.equal(
    messages[0].match(/(?:^|\s)(https:\/\/\S+)(?=\s|$)/)?.[1],
    "https://feat-gamma-volleybro-blueprint.andrewck24.workers.dev/changes/gamma",
  );
  assert.match(messages[0], /\b1 commits\b/);
  assert.equal(messages[1], "rebuild skipped");
});

test("--gate G1 publishes the Proposal alone before the whole page", async (t) => {
  const { bare, work } = await makeGateRepository(t, { review: true });
  quiet(t);

  await runGate(work, "gamma", {
    g1: true,
    runCheck: async () => true,
    rebuild: noRebuild,
  });

  const [whole, proposalOnly] = await storeLog(bare);
  await assert.rejects(storeFile(bare, proposalOnly, "review.mdx"));
  assert.equal(
    JSON.parse(await storeFile(bare, proposalOnly, "facts.json")).gate,
    "G1",
  );
  assert.equal(await storeFile(bare, whole, "review.mdx"), REVIEW_FILE);
});

test("the preview rebuild starts a build on the preview trigger and reads it once", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rebuild-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "blueprint"));
  await writeFile(
    path.join(root, "blueprint", "wrangler.toml"),
    'name = "docs-site"\n',
  );
  const calls = [];
  const cf = async (_root, args) => {
    calls.push(args.join(" "));
    if (args[0] === "workers") {
      return [
        { id: "other", script_name: "docs-site-old" },
        { id: "tag1", script_name: "docs-site" },
      ];
    }
    if (args[1] === "triggers") {
      return [
        { trigger_uuid: "prod", branch_includes: ["main"] },
        { trigger_uuid: "preview", branch_includes: ["*"] },
      ];
    }
    if (args[1] === "create") return { build_uuid: "b1" };
    return { status: "queued" };
  };
  const message = await rebuildPreview(root, "feat/gamma", { cf });
  assert.deepEqual(calls, [
    "workers scripts search --name docs-site",
    "builds triggers list --external-script-id tag1",
    'builds create preview --body {"branch":"feat/gamma"}',
    "builds get b1",
  ]);
  assert.match(message, /build b1 started \(queued\)/);
});

test("the preview rebuild falls back to the manual instruction when cf fails", async () => {
  const cf = async () => {
    throw new Error("Not logged in");
  };
  assert.match(
    await rebuildPreview("/repo", "feat/gamma", { cf }),
    /through cf: .*auth login.*Cloudflare dashboard/,
  );
});

test("a preview URL folds the branch name into one DNS label", () => {
  assert.equal(
    previewUrl("hotfix/single-page-change-leftovers", "x"),
    "https://hotfix-single-page-change-leftovers-volleybro-blueprint.andrewck24.workers.dev/changes/x",
  );
});

test("preview CLI prefers installed cf and falls back only when absent", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "preview-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "blueprint"));
  await writeFile(
    path.join(root, "blueprint", "wrangler.toml"),
    'name = "docs-site"\n',
  );
  const moduleUrl = new URL("../blueprint-gate.js", import.meta.url).href;
  const output = `if (process.argv.includes("search")) console.log(JSON.stringify([{id:"id",script_name:"docs-site"}]));
else if (process.argv.includes("triggers")) console.log(JSON.stringify([{trigger_uuid:"trigger",branch_includes:["*"]}]));
else if (process.argv.includes("create")) console.log(JSON.stringify({build_uuid:"build"}));
else console.log(JSON.stringify({status:"queued"}));`;
  for (const [name, globalCf, launcher, success] of [
    ["installed", output, "missing", true],
    [
      "auth failure",
      'console.error("Not logged in"); process.exit(1);',
      "native",
      false,
    ],
    ["invalid JSON", 'console.log("invalid JSON");', "native", false],
    ["native fallback", null, "native", true],
    ["JS fallback", null, "JS", true],
  ]) {
    await t.test(name, async () => {
      const bin = path.join(root, name.replaceAll(" ", "-"));
      await mkdir(bin);
      const executable = async (file, source) => {
        await writeFile(file, `#!${process.execPath}\n${source}\n`);
        await chmod(file, 0o755);
      };
      if (globalCf !== null) await executable(path.join(bin, "cf"), globalCf);
      const pnpm = path.join(bin, launcher === "JS" ? "pnpm.cjs" : "pnpm");
      if (launcher !== "missing") {
        await executable(path.join(bin, "pnpm.cjs"), output);
        if (launcher === "native") {
          await writeFile(
            pnpm,
            `#!/bin/sh\nexec '${process.execPath}' '${path.join(bin, "pnpm.cjs")}' "$@"\n`,
          );
          await chmod(pnpm, 0o755);
        }
      }
      const { stdout } = await execFileAsync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `
        import { rebuildPreview } from ${JSON.stringify(moduleUrl)};
        console.log(await rebuildPreview(${JSON.stringify(root)}, "feat/example"));
      `,
        ],
        { env: { ...process.env, PATH: bin, npm_execpath: pnpm } },
      );
      assert.match(
        stdout,
        success ? /build build started \(queued\)/ : /Could not start/,
      );
    });
  }
});
