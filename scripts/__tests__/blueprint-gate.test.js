import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { previewUrl, rebuildPreview, runGate } from "../blueprint-gate.js";
import { changeInputHash } from "../blueprint-lifecycle.js";

const execFileAsync = promisify(execFile);

const git = (cwd) => (args) => execFileAsync("git", args, { cwd });

const PAGE_FILES = {
  "index.mdx": "---\ntitle: gamma\n---\n",
  "proposal.mdx":
    'export const scenarios = [\n  { id: "S1", given: "a", when: "b", then: "c" },\n];\n\nThe proposal.\n',
};
const REVIEW_FILE = "<ActionItems>\n\n無\n\n</ActionItems>\n";
const SHA = "a".repeat(40);

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      if (body instanceof Error) throw body;
      return body;
    },
    async text() {
      return String(body);
    },
  };
}

function receipt(inputHash, overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSha: SHA,
    integrationSha: "b".repeat(40),
    storeSha: "c".repeat(40),
    changeInputHashes: { gamma: inputHash },
    ...overrides,
  };
}

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
  return { bare, dir, work, workGit };
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

test("the CLI accepts --preview and reaches the existing branch-state gate", async (t) => {
  const { work, workGit } = await makeGateRepository(t);
  await writeFile(path.join(work, "b.txt"), "b\n");
  await workGit(["add", "b.txt"]);
  await workGit(["commit", "-q", "-m", "feat: add b"]);

  const gateScript = fileURLToPath(
    new URL("../blueprint-gate.js", import.meta.url),
  );
  const error = await execFileAsync(
    process.execPath,
    [gateScript, "gamma", "--preview"],
    {
      cwd: work,
    },
  ).catch((caught) => caught);

  assert.notEqual(error.code, undefined);
  assert.match(error.stderr, /branch is ahead of its upstream/);
  assert.doesNotMatch(error.stderr, /Usage:/);
});

test("the default gate waits for the production receipt and successfully GETs the published page", async (t) => {
  const { bare, dir, work } = await makeGateRepository(t);
  const checked = [];
  const requests = [];
  const waits = [];
  let clock = 0;
  quiet(t);

  await runGate(work, "gamma", {
    runCheck: async (slug) => {
      checked.push(slug);
      return true;
    },
    cf: async () =>
      assert.fail("production gate must not start a branch build"),
    now: () => clock,
    wait: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    timeoutMs: 25_000,
    fetchHosted: async (url, options) => {
      requests.push({ url, options });
      if (url.includes("blueprint-build.json")) {
        const hash = await changeInputHash(dir);
        return response(200, receipt(hash));
      }
      return response(200, "rendered page");
    },
  });

  assert.equal((await storeLog(bare)).length, 1);
  assert.deepEqual(checked, ["gamma"]);
  assert.equal(waits.length, 0);
  assert.equal(
    requests[0].url.startsWith(
      "https://volleybro-blueprint.andrewck24.workers.dev/blueprint-build.json?",
    ),
    true,
  );
  assert.ok(
    requests[1].url.startsWith(
      "https://volleybro-blueprint.andrewck24.workers.dev/changes/gamma?run=",
    ),
  );
  assert.ok(requests.every((request) => request.options.cache === "no-store"));
  assert.match(
    console.log.mock.calls.at(-1).arguments[0],
    /Production hosted proof verified: https:\/\/volleybro-blueprint\.andrewck24\.workers\.dev\/changes\/gamma/,
  );
});

test("a render failure with matching inputs is not ready for acceptance", async (t) => {
  const { work } = await makeGateRepository(t);
  let clock = 0;
  quiet(t);
  await assert.rejects(
    runGate(work, "gamma", {
      runCheck: async () => true,
      now: () => clock,
      wait: async (ms) => {
        clock += ms;
      },
      timeoutMs: 15_000,
      fetchHosted: async (url) =>
        url.includes("blueprint-build.json")
          ? response(
              200,
              receipt(
                await changeInputHash(
                  path.join(work, "blueprint/content/changes/gamma"),
                ),
              ),
            )
          : response(200, '<p data-blueprint-render-error="true">無法顯示</p>'),
    }),
    /contains a tab render failure/,
  );
});

test("an old receipt cannot pass the gate and timeout reports the page is not ready", async (t) => {
  const { work } = await makeGateRepository(t);
  let clock = 0;
  quiet(t);

  await assert.rejects(
    runGate(work, "gamma", {
      runCheck: async () => true,
      now: () => clock,
      wait: async (ms) => {
        clock += ms;
      },
      timeoutMs: 15_000,
      fetchHosted: async (url) => {
        assert.match(url, /blueprint-build\.json/);
        return response(200, receipt("stale-input-hash"));
      },
    }),
    /Timed out after 15000ms.*receipt does not match.*not ready for human acceptance/,
  );
});

test("the gate keeps polling until the matching receipt and Change page are both available", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  const requests = [];
  let clock = 0;
  let pageAttempts = 0;
  quiet(t);

  await runGate(work, "gamma", {
    runCheck: async () => true,
    now: () => clock,
    wait: async (ms) => {
      clock += ms;
    },
    timeoutMs: 25_000,
    fetchHosted: async (url) => {
      requests.push(url);
      if (url.includes("blueprint-build.json")) {
        const count = requests.filter((request) =>
          request.includes("blueprint-build.json"),
        ).length;
        return response(
          200,
          receipt(count === 1 ? "old-hash" : await changeInputHash(dir)),
        );
      }
      pageAttempts += 1;
      return response(pageAttempts === 1 ? 503 : 200, "page");
    },
  });

  assert.equal(pageAttempts, 2);
  assert.equal(
    requests.filter((url) => url.includes("blueprint-build.json")).length,
    3,
  );
  assert.equal(clock, 20_000);
});

test("--gate G1 publishes the Proposal alone before the whole page", async (t) => {
  const { bare, dir, work } = await makeGateRepository(t, { review: true });
  quiet(t);

  await runGate(work, "gamma", {
    g1: true,
    runCheck: async () => true,
    fetchHosted: async (url) => {
      if (url.includes("blueprint-build.json")) {
        return response(200, receipt(await changeInputHash(dir)));
      }
      return response(200, "rendered page");
    },
  });

  const [whole, proposalOnly] = await storeLog(bare);
  await assert.rejects(storeFile(bare, proposalOnly, "review.mdx"));
  assert.equal(
    JSON.parse(await storeFile(bare, proposalOnly, "facts.json")).gate,
    "G1",
  );
  assert.equal(await storeFile(bare, whole, "review.mdx"), REVIEW_FILE);
});

test("--preview rebuilds the branch, waits for success, then verifies its receipt and page", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  await mkdir(path.join(work, "blueprint"), { recursive: true });
  await writeFile(
    path.join(work, "blueprint", "wrangler.toml"),
    'name = "docs-site"\n',
  );
  const calls = [];
  const requests = [];
  const waits = [];
  const pageHashes = [];
  const receiptSourceShas = ["d".repeat(40)];
  const sourceSha = (
    await execFileAsync("git", ["rev-parse", "HEAD^{commit}"], { cwd: work })
  ).stdout.trim();
  receiptSourceShas.push(sourceSha);
  let clock = 0;
  let receiptReads = 0;
  quiet(t);

  await runGate(work, "gamma", {
    preview: true,
    runCheck: async () => true,
    now: () => clock,
    wait: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    timeoutMs: 25_000,
    cf: async (_root, args) => {
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
      const buildReads = calls.filter(
        (call) => call === "builds get b1",
      ).length;
      return buildReads === 1
        ? { status: "queued" }
        : { status: "stopped", build_outcome: "success" };
    },
    fetchHosted: async (url) => {
      requests.push(url);
      if (url.includes("blueprint-build.json")) {
        const inputHash = await changeInputHash(dir);
        pageHashes.push(inputHash);
        const receiptIndex = receiptReads++;
        return response(
          200,
          receipt(inputHash, {
            sourceSha: receiptSourceShas[receiptIndex],
          }),
        );
      }
      return response(200, "rendered preview");
    },
  });

  assert.deepEqual(calls, [
    "workers scripts search --name docs-site",
    "builds triggers list --external-script-id tag1",
    'builds create preview --body {"branch":"feat/gamma"}',
    "builds get b1",
    "builds get b1",
  ]);
  assert.deepEqual(waits, [10_000, 10_000]);
  assert.equal(receiptReads, 2);
  assert.equal(new Set(pageHashes).size, 1);
  assert.equal(
    requests.filter((url) => url.includes("/changes/gamma")).length,
    1,
  );
  assert.match(
    requests[0],
    /^https:\/\/feat-gamma-volleybro-blueprint\.andrewck24\.workers\.dev\/blueprint-build\.json/,
  );
  assert.equal(
    requests.some(
      (url) =>
        url.includes("volleybro-blueprint.andrewck24.workers.dev") &&
        !url.includes("feat-gamma-"),
    ),
    false,
  );
});

test("a failed branch build cannot proceed to hosted acceptance", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rebuild-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "blueprint"));
  await writeFile(
    path.join(root, "blueprint", "wrangler.toml"),
    'name = "docs-site"\n',
  );
  const requests = [];
  const cf = async (_root, args) => {
    if (args[0] === "workers") return [{ id: "id", script_name: "docs-site" }];
    if (args[1] === "triggers")
      return [{ trigger_uuid: "preview", branch_includes: ["*"] }];
    if (args[1] === "create") return { build_uuid: "build" };
    return { status: "stopped", build_outcome: "failure" };
  };

  await assert.rejects(
    rebuildPreview(root, "feat/gamma", "gamma", SHA, {
      cf,
      fetchHosted: async (url) => {
        requests.push(url);
        return response(200, receipt(SHA));
      },
    }),
    /stopped with outcome failure/,
  );
  assert.deepEqual(requests, []);
});

test("previewUrl folds the branch name into one DNS label", () => {
  assert.equal(
    previewUrl("hotfix/single-page-change-leftovers", "x"),
    "https://hotfix-single-page-change-leftovers-volleybro-blueprint.andrewck24.workers.dev/changes/x",
  );
});

test("preview rebuild explains Cloudflare authentication failures", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rebuild-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "blueprint"));
  await writeFile(
    path.join(root, "blueprint", "wrangler.toml"),
    'name = "docs-site"\n',
  );

  await assert.rejects(
    rebuildPreview(root, "feat/gamma", "gamma", SHA, {
      cf: async () => {
        throw new Error("Not logged in");
      },
    }),
    /through cf: .*auth login.*Cloudflare dashboard/,
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
else console.log(JSON.stringify({status:"stopped",build_outcome:"success"}));`;
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
      const args = [
        "--input-type=module",
        "-e",
        `
        import { rebuildPreview } from ${JSON.stringify(moduleUrl)};
        const fetchHosted = async (url) => ({ ok: true, status: 200, json: async () => (${JSON.stringify(receipt(SHA))}), text: async () => 'rendered page' });
        const proof = await rebuildPreview(${JSON.stringify(root)}, "feat/example", "gamma", ${JSON.stringify(SHA)}, { fetchHosted });
        console.log(proof.build);
      `,
      ];
      const options = {
        env: { ...process.env, PATH: bin, npm_execpath: pnpm },
      };
      if (success) {
        const { stdout } = await execFileAsync(process.execPath, args, options);
        assert.match(stdout, /build/);
      } else {
        const error = await execFileAsync(
          process.execPath,
          args,
          options,
        ).catch((caught) => caught);
        assert.notEqual(error.code, undefined);
        assert.match(error.stderr, /Could not start/);
      }
    });
  }
});
