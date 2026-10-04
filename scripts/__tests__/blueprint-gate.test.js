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
    gh: async () =>
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

test("--preview waits for its exact GitHub run and rejects a stale hosted snapshot", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  let fields;
  let clock = 0;
  let polls = 0;
  let reads = 0;
  quiet(t);
  await runGate(work, "gamma", {
    preview: true,
    runCheck: async () => true,
    now: () => clock,
    wait: async (ms) => {
      clock += ms;
    },
    timeoutMs: 40_000,
    gh: async (_root, args) => {
      if (args[0] === "workflow") {
        fields = Object.fromEntries(
          args
            .filter((_, i) => args[i - 1] === "-f")
            .map((value) => value.split("=")),
        );
        return null;
      }
      polls += 1;
      return [
        {
          databaseId: 1,
          displayTitle: "Blueprint Preview another-request",
          headSha: fields.integration_sha,
          status: "completed",
          conclusion: "success",
        },
        {
          databaseId: 2,
          displayTitle: "Blueprint Preview " + fields.request_id,
          headSha: fields.integration_sha,
          status: polls === 1 ? "queued" : "completed",
          conclusion: polls === 1 ? null : "success",
        },
      ];
    },
    fetchHosted: async (url) => {
      if (url.includes("blueprint-build.json")) {
        reads += 1;
        return response(
          200,
          receipt(await changeInputHash(dir), {
            sourceSha: fields.source_sha,
            integrationSha: fields.integration_sha,
            storeSha: reads === 1 ? "d".repeat(40) : fields.store_sha,
          }),
        );
      }
      return response(200, "rendered preview");
    },
  });
  assert.equal(fields.branch, "feat/gamma");
  assert.equal(
    fields.source_sha,
    (await git(work)(["rev-parse", "HEAD"])).stdout.trim(),
  );
  assert.equal(reads, 2);
  assert.equal(clock, 20_000);
  assert.match(
    console.log.mock.calls.at(-1).arguments[0],
    /Branch preview build 2 hosted proof verified/,
  );
});

test("a failed GitHub preview cannot proceed to hosted acceptance", async (t) => {
  const { work } = await makeGateRepository(t);
  quiet(t);
  let fields;
  const requests = [];
  await assert.rejects(
    runGate(work, "gamma", {
      preview: true,
      runCheck: async () => true,
      gh: async (_root, args) => {
        if (args[0] === "workflow") {
          fields = Object.fromEntries(
            args
              .filter((_, i) => args[i - 1] === "-f")
              .map((value) => value.split("=")),
          );
          return null;
        }
        return [
          {
            databaseId: 2,
            displayTitle: "Blueprint Preview " + fields.request_id,
            headSha: fields.integration_sha,
            status: "completed",
            conclusion: "failure",
          },
        ];
      },
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

test("preview dispatch reports GitHub authentication failure without probing a host", async (t) => {
  const { work } = await makeGateRepository(t);
  quiet(t);
  await assert.rejects(
    runGate(work, "gamma", {
      preview: true,
      runCheck: async () => true,
      gh: async () => {
        throw new Error("Not logged in");
      },
      fetchHosted: async () =>
        assert.fail("failed dispatch must not probe a host"),
    }),
    /dispatch Blueprint Preview through GitHub: Not logged in/,
  );
});

test("the installed GitHub CLI may return a run URL when dispatch succeeds", async (t) => {
  const { dir, work } = await makeGateRepository(t);
  quiet(t);
  await runGate(work, "gamma", {
    runCheck: async () => true,
    fetchHosted: async (url) =>
      url.includes("blueprint-build.json")
        ? response(200, receipt(await changeInputHash(dir)))
        : response(200, "page"),
  });
  const bin = await mkdtemp(path.join(os.tmpdir(), "blueprint-gh-cli-"));
  t.after(() => rm(bin, { recursive: true, force: true }));
  const requestPath = path.join(bin, "request.json");
  const cli = path.join(bin, "gh");
  await writeFile(
    cli,
    `#!${process.execPath}
import {readFileSync, writeFileSync} from 'node:fs';
const args=process.argv.slice(2);
const file=${JSON.stringify(requestPath)};
if(args[0]==='workflow') {
  const inputs=Object.fromEntries(args.filter((_,i)=>args[i-1]==='-f').map(x=>x.split('=')));
  writeFileSync(file,JSON.stringify(inputs));
  console.log('https://github.com/andrewck24/volleybro/actions/runs/123');
} else {
  const inputs=JSON.parse(readFileSync(file,'utf8'));
  console.log(JSON.stringify([{databaseId:123,displayTitle:'Blueprint Preview '+inputs.request_id,headSha:inputs.integration_sha,status:'completed',conclusion:'success'}]));
}
`,
  );
  await chmod(cli, 0o755);
  const moduleUrl = new URL("../blueprint-gate.js", import.meta.url).href;
  const probe = `
import {readFileSync} from 'node:fs';
import {rebuildPreview} from ${JSON.stringify(moduleUrl)};
const proof=await rebuildPreview(${JSON.stringify(work)}, 'feat/gamma', 'gamma', ${JSON.stringify(await changeInputHash(dir))}, {
 fetchHosted: async url => ({ok:true,status:200,
 json:async()=>{const i=JSON.parse(readFileSync(${JSON.stringify(requestPath)},'utf8'));return {schemaVersion:1,sourceSha:i.source_sha,integrationSha:i.integration_sha,storeSha:i.store_sha,changeInputHashes:{gamma:i.input_hash}};},
 text:async()=> 'rendered preview'})
});
console.log(proof.build);
`;
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    {
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      },
    },
  );
  assert.equal(stdout.trim(), "123");
});
