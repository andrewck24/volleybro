import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { coordinateRebuild } from "../blueprint-rebuild.js";

test("drains a cancelled predecessor and deploys the newest publication arriving during a build", async () => {
  let sourceSha = "main-a";
  let storeSha = "store-a";
  let deployed = null;
  const events = [];
  const inputs = new Map();
  const result = await coordinateRebuild({
    latest: async () => ({ sourceSha, storeSha }),
    receipt: async () => deployed,
    active: async () => ["predecessor"],
    trigger: async () => {
      const id = `build-${inputs.size}`;
      inputs.set(id, { sourceSha, integrationSha: sourceSha, storeSha });
      events.push(`start:${id}`);
      return id;
    },
    wait: async (id, { requireSuccess = true } = {}) => {
      events.push(`finish:${id}`);
      if (id === "predecessor") {
        if (requireSuccess) throw new Error("Predecessor was cancelled");
        return;
      }
      deployed = inputs.get(id);
      if (id === "build-0") {
        sourceSha = "main-b";
        storeSha = "store-b";
      }
    },
  });
  assert.deepEqual(events, [
    "finish:predecessor",
    "start:build-0",
    "finish:build-0",
    "start:build-1",
    "finish:build-1",
  ]);
  assert.equal(result.sourceSha, "main-b");
  assert.equal(result.storeSha, "store-b");
});

test("coalesces queued requests already covered by the deployed receipt", async () => {
  const deployed = { sourceSha: "a", integrationSha: "a", storeSha: "b" };
  const result = await coordinateRebuild({
    latest: async () => ({ sourceSha: "a", storeSha: "b" }),
    receipt: async () => deployed,
    active: async () => [],
    wait: async () => assert.fail("No build should be awaited"),
    trigger: async () => assert.fail("No redundant build should be started"),
  });
  assert.equal(result, deployed);
});

test("a successful platform build without the requested receipt is not accepted", async () => {
  await assert.rejects(
    coordinateRebuild({
      latest: async () => ({ sourceSha: "a", storeSha: "b" }),
      receipt: async () => ({
        sourceSha: "old",
        integrationSha: "old",
        storeSha: "b",
      }),
      active: async () => [],
      wait: async () => {},
      trigger: async () => "build",
    }),
    /without the requested input receipt/,
  );
});

const nativeHarness = String.raw`
import { writeFileSync } from "node:fs";

const triggerId = process.env.CLOUDFLARE_BLUEPRINT_PRODUCTION_TRIGGER_ID;
const hookId = process.env.CLOUDFLARE_BLUEPRINT_DEPLOY_HOOK.split("/").at(-1);
const sourceRef = "refs/heads/main";
const storeRef = "refs/heads/blueprint-changes";
const sourceA = "a".repeat(40);
const sourceB = "b".repeat(40);
const storeSha = "c".repeat(40);
let requested = 0;
let completed = 0;

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
  if (url.hostname === "api.cloudflare.com" && options.method !== "POST" && options.headers?.Authorization !== "Bearer read-token") throw new Error("Missing Cloudflare authorization");
  if (url.pathname.endsWith("/blueprint-build.json")) {
    if (!completed) return new Response(null, { status: 404 });
    const sourceSha = completed === 1 ? sourceA : sourceB;
    return json({ sourceSha, integrationSha: sourceSha, storeSha });
  }
  if (url.pathname.endsWith("/deploy_hooks/" + hookId) && options.method !== "POST") {
    return json({ success: true, result: {
      deploy_hook_uuid: hookId,
      external_script_id: process.env.CLOUDFLARE_BLUEPRINT_WORKER_ID,
      branch: process.env.COORDINATOR_HOOK_BRANCH ?? "main",
    } });
  }
  if (url.pathname.endsWith("/deploy_hooks/" + hookId) && options.method === "POST") {
    return json({ success: true, result: { build_uuid: "build-" + requested++ } });
  }
  if (url.pathname.endsWith("/builds")) {
    const page = url.searchParams.get("page");
    const result = page === "1"
      ? [{ build_uuid: "production-build", status: "building", trigger: { trigger_uuid: "different-trigger" } }]
      : [{ build_uuid: "previous-build", status: "building", trigger: { trigger_uuid: triggerId } }];
    return json({ success: true, result, result_info: { total_pages: 2 } });
  }
  const build = decodeURIComponent(url.pathname.split("/").at(-1));
  if (build === "previous-build") return json({ success: true, result: {
    status: "stopped", build_outcome: "cancelled", trigger: { trigger_uuid: triggerId },
  } });
  if (build === "build-0") {
    completed = 1;
    writeFileSync(process.env.COORDINATOR_REFS_FILE, sourceB + "\t" + sourceRef + "\n" + storeSha + "\t" + storeRef + "\n");
  } else if (build === "build-1") {
    completed = 2;
  } else {
    throw new Error("Unexpected build " + build);
  }
  return json({ success: true, result: {
    status: "stopped", build_outcome: "success", trigger: { trigger_uuid: triggerId },
  } });
};
`;

async function runNativeCli({ hookBranch = "main" } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "blueprint-rebuild-"));
  const bin = join(directory, "bin");
  const refsFile = join(directory, "refs");
  const sourceRef = "refs/heads/main";
  const storeRef = "refs/heads/blueprint-changes";
  const sourceSha = "a".repeat(40);
  const storeSha = "c".repeat(40);
  await mkdir(bin);
  await writeFile(join(directory, "preload.mjs"), nativeHarness);
  await writeFile(
    join(bin, "git"),
    '#!/bin/sh\ncat "$COORDINATOR_REFS_FILE"\n',
  );
  await chmod(join(bin, "git"), 0o755);
  await writeFile(
    refsFile,
    `${sourceSha}\t${sourceRef}\n${storeSha}\t${storeRef}\n`,
  );
  const script = fileURLToPath(
    new URL("../blueprint-rebuild.js", import.meta.url),
  );
  try {
    return spawnSync(
      process.execPath,
      ["--import", join(directory, "preload.mjs"), script],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 10_000,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          CLOUDFLARE_ACCOUNT_ID: "account",
          CLOUDFLARE_BLUEPRINT_BUILD_READ_TOKEN: "read-token",
          CLOUDFLARE_BLUEPRINT_WORKER_ID: "blueprint-worker",
          CLOUDFLARE_BLUEPRINT_PRODUCTION_TRIGGER_ID:
            "55a112d3-d521-4e36-a798-c3cdaae410ca",
          CLOUDFLARE_BLUEPRINT_DEPLOY_HOOK:
            "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/66666666-6666-4666-8666-666666666666",
          COORDINATOR_HOOK_BRANCH: hookBranch,
          COORDINATOR_REFS_FILE: refsFile,
        },
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("CLI drains its paginated active build and catches up to inputs published during a build", async () => {
  const result = await runNativeCli();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Build previous-build: cancelled/);
  assert.match(result.stdout, /Deployed source=b{40} store=c{40}/);
  assert.equal((result.stdout.match(/Requested build/g) ?? []).length, 2);
});

test("CLI refuses to trigger when the configured hook targets another branch", async () => {
  const result = await runNativeCli({ hookBranch: "feature" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not bound to the configured source branch/);
  assert.doesNotMatch(result.stdout, /Requested build/);
});
