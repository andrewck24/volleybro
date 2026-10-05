import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { previewUrl, runGate } from "../blueprint-gate.js";
import { changeInputHash } from "../blueprint-lifecycle.js";

const execFileAsync = promisify(execFile);
const git = (cwd) => (args) => execFileAsync("git", args, { cwd });
const PAGE_FILES = {
  "index.mdx": "---\ntitle: gamma\n---\n",
  "proposal.mdx":
    'export const scenarios = [{ id: "S1", given: "a", when: "b", then: "c" }];\n\nThe proposal.\n',
};
const SHA = "a".repeat(40);

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

function identity(build) {
  return [
    build.sourceSha,
    build.integrationSha,
    build.storeSha,
    build.changeInputHashes.gamma,
  ].join(":");
}

function html(build, attributes = "") {
  return `<main data-blueprint-build-identity="${identity(build)}" ${attributes}>Change</main>`;
}

function response(body, status = 200) {
  return new Response(body, { status });
}

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
  if (review)
    await writeFile(
      path.join(dir, "review.mdx"),
      "<ActionItems>\n\n無\n\n</ActionItems>\n",
    );
  return { bare, dir, work };
}

async function installGh(t, { outcome = "success", unrelated = false } = {}) {
  const bin = await mkdtemp(path.join(os.tmpdir(), "blueprint-gh-cli-"));
  t.after(() => rm(bin, { recursive: true, force: true }));
  const requestPath = path.join(bin, "request.json");
  const cli = path.join(bin, "gh");
  await writeFile(
    cli,
    `#!${process.execPath}\nimport {readFileSync, writeFileSync} from 'node:fs';\nconst args=process.argv.slice(2);\nconst file=${JSON.stringify(requestPath)};\nif(args[0]==='workflow') {\n const inputs=Object.fromEntries(args.filter((_,i)=>args[i-1]==='-f').map(x=>x.split('=')));\n writeFileSync(file,JSON.stringify(inputs));\n console.log('https://github.com/andrewck24/volleybro/actions/runs/123');\n} else if (${JSON.stringify(outcome)}==='dispatch-error') {\n console.error('Not logged in'); process.exit(1);\n} else {\n const inputs=JSON.parse(readFileSync(file,'utf8'));\n const runs=${JSON.stringify(unrelated)} ? [{databaseId:1,displayTitle:'Blueprint Preview other-request',headSha:inputs.integration_sha,status:'completed',conclusion:'success'}] : [];\n runs.push({databaseId:123,displayTitle:'Blueprint Preview '+inputs.request_id,headSha:inputs.integration_sha,status:'completed',conclusion:${JSON.stringify(outcome)}});\n console.log(JSON.stringify(runs));\n}\n`,
  );
  await chmod(cli, 0o755);
  const previousPath = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${previousPath}`;
  t.after(() => {
    process.env.PATH = previousPath;
  });
  return requestPath;
}

function quiet(t) {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
}

async function useHostedBuild(t, dir, render) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = String(input);
    requests.push({ url, options });
    if (url.includes("blueprint-build.json")) {
      const inputHash = await changeInputHash(dir);
      return response(JSON.stringify(receipt(inputHash)));
    }
    const build = receipt(await changeInputHash(dir));
    return response(render(build));
  });
  return requests;
}

test("the gate refuses a branch ahead of its upstream before publishing", async (t) => {
  const { bare, work } = await makeGateRepository(t);
  await writeFile(path.join(work, "b.txt"), "b\n");
  await git(work)(["add", "b.txt"]);
  await git(work)(["commit", "-q", "-m", "feat: add b"]);
  quiet(t);

  await runGate(work, "gamma", { runCheck: async () => true });

  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
  await assert.rejects(
    execFileAsync("git", ["log", "blueprint-changes"], { cwd: bare }),
  );
});

test("the CLI accepts --preview and reaches the existing branch-state gate", async (t) => {
  const { work } = await makeGateRepository(t);
  await writeFile(path.join(work, "b.txt"), "b\n");
  await git(work)(["add", "b.txt"]);
  await git(work)(["commit", "-q", "-m", "feat: add b"]);
  const gateScript = fileURLToPath(
    new URL("../blueprint-gate.js", import.meta.url),
  );
  const error = await execFileAsync(
    process.execPath,
    [gateScript, "gamma", "--preview"],
    { cwd: work },
  ).catch((caught) => caught);

  assert.notEqual(error.code, undefined);
  assert.match(error.stderr, /branch is ahead of its upstream/);
  assert.doesNotMatch(error.stderr, /Usage:/);
});

test("the production gate accepts only a page rendered from the receipt snapshot", async (t) => {
  const { bare, dir, work } = await makeGateRepository(t);
  quiet(t);
  const requests = await useHostedBuild(t, dir, (build) => html(build));

  await runGate(work, "gamma", { runCheck: async () => true });

  assert.equal(
    (
      await execFileAsync(
        "git",
        ["log", "--format=%H", "blueprint-changes", "--", "gamma/facts.json"],
        { cwd: bare },
      )
    ).stdout
      .trim()
      .split("\n").length,
    1,
  );
  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ options }) => options.cache === "no-store"));
  assert.match(
    console.log.mock.calls.at(-1).arguments[0],
    /Production hosted proof verified/,
  );
});

test("the gate keeps polling until a current receipt and rendered page are available", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  quiet(t);
  let clock = 0;
  let receiptRequests = 0;
  let pageRequests = 0;
  t.mock.method(Date, "now", () => clock);
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    clock += delay;
    queueMicrotask(callback);
    return 0;
  });
  t.mock.method(globalThis, "fetch", async (input) => {
    if (String(input).includes("blueprint-build.json")) {
      receiptRequests += 1;
      const hash = await changeInputHash(dir);
      return response(
        JSON.stringify(receipt(receiptRequests === 1 ? "stale-input" : hash)),
      );
    }
    pageRequests += 1;
    const current = receipt(await changeInputHash(dir));
    return pageRequests === 1
      ? response("temporarily unavailable", 503)
      : response(html(current));
  });

  await runGate(work, "gamma", { runCheck: async () => true });

  assert.equal(receiptRequests, 3);
  assert.equal(pageRequests, 2);
  assert.equal(clock, 20_000);
});

test("a matching receipt cannot admit a different deployed page snapshot", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  quiet(t);
  const requests = await useHostedBuild(
    t,
    dir,
    () =>
      '<main data-blueprint-build-identity="different-source:different-input">Change</main>',
  );
  let clock = 0;
  t.mock.method(Date, "now", () => clock);
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    clock += delay;
    queueMicrotask(callback);
    return 0;
  });

  await assert.rejects(
    runGate(work, "gamma", { runCheck: async () => true }),
    /Timed out after 2700000ms.*snapshot identity does not match.*not ready for human acceptance/,
  );
  assert.ok(
    requests.filter(({ url }) => url.includes("blueprint-build.json")).length >
      1,
  );
});

test("a page render failure cannot be accepted", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  quiet(t);
  await useHostedBuild(t, dir, (build) =>
    html(build, 'data-blueprint-render-error="true"'),
  );
  let clock = 0;
  t.mock.method(Date, "now", () => clock);
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    clock += delay;
    queueMicrotask(callback);
    return 0;
  });

  await assert.rejects(
    runGate(work, "gamma", { runCheck: async () => true }),
    /contains a tab render failure/,
  );
});

test("--gate G1 publishes the Proposal before the whole page", async (t) => {
  const { bare, dir, work } = await makeGateRepository(t, { review: true });
  quiet(t);
  await useHostedBuild(t, dir, (build) => html(build));

  await runGate(work, "gamma", { g1: true, runCheck: async () => true });

  const { stdout } = await execFileAsync(
    "git",
    ["log", "--format=%H", "blueprint-changes", "--", "gamma/facts.json"],
    { cwd: bare },
  );
  const [whole, proposalOnly] = stdout.trim().split("\n");
  await assert.rejects(
    execFileAsync("git", ["show", `${proposalOnly}:gamma/review.mdx`], {
      cwd: bare,
    }),
  );
  assert.equal(
    JSON.parse(
      (
        await execFileAsync(
          "git",
          ["show", `${proposalOnly}:gamma/facts.json`],
          { cwd: bare },
        )
      ).stdout,
    ).gate,
    "G1",
  );
  assert.match(
    (
      await execFileAsync("git", ["show", `${whole}:gamma/review.mdx`], {
        cwd: bare,
      })
    ).stdout,
    /ActionItems/,
  );
});

test("preview gate waits for its exact GitHub run and accepts the corresponding page receipt", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  quiet(t);
  const requestPath = await installGh(t, { unrelated: true });
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = String(input);
    requests.push({ url, options });
    const fields = JSON.parse(
      await (await import("node:fs/promises")).readFile(requestPath, "utf8"),
    );
    const build = receipt(fields.input_hash, {
      sourceSha: fields.source_sha,
      integrationSha: fields.integration_sha,
      storeSha: fields.store_sha,
    });
    return url.includes("blueprint-build.json")
      ? response(JSON.stringify(build))
      : response(html(build));
  });
  await runGate(work, "gamma", { preview: true, runCheck: async () => true });

  const fields = JSON.parse(
    await (await import("node:fs/promises")).readFile(requestPath, "utf8"),
  );
  assert.equal(fields.branch, "feat/gamma");
  assert.equal(
    fields.source_sha,
    (await git(work)(["rev-parse", "HEAD"])).stdout.trim(),
  );
  assert.equal(fields.input_hash, await changeInputHash(dir));
  assert.equal(requests.length, 2);
  assert.match(
    console.log.mock.calls.at(-1).arguments[0],
    /Branch preview build 123 hosted proof verified/,
  );
});

test("a failed preview run stops before hosted acceptance", async (t) => {
  const { work } = await makeGateRepository(t);
  quiet(t);
  await installGh(t, { outcome: "failure" });
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input) => {
    requests.push(String(input));
    return response(JSON.stringify(receipt(SHA)));
  });

  await assert.rejects(
    runGate(work, "gamma", { preview: true, runCheck: async () => true }),
    /stopped with outcome failure/,
  );
  assert.deepEqual(requests, []);
});

test("a GitHub CLI authentication error stops before hosted acceptance", async (t) => {
  const { work } = await makeGateRepository(t);
  quiet(t);
  await installGh(t, { outcome: "dispatch-error" });
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input) => {
    requests.push(String(input));
    return response("{}");
  });

  await assert.rejects(
    runGate(work, "gamma", { preview: true, runCheck: async () => true }),
    /gh run list.*Not logged in/s,
  );
  assert.deepEqual(requests, []);
});

test("previewUrl folds the branch name into one DNS label", () => {
  assert.equal(
    previewUrl("hotfix/single-page-change-leftovers", "x"),
    "https://hotfix-single-page-change-leftovers-volleybro-blueprint.andrewck24.workers.dev/changes/x",
  );
});
