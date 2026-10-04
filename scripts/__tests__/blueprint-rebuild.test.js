import assert from "node:assert/strict";
import test from "node:test";

import {
  coordinateRebuild,
  createNativeBuildCoordinator,
} from "../blueprint-rebuild.js";

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

test("native rehearsal drains only its trigger and catches up to a store merge during a build", async () => {
  const previewTrigger = "55a112d3-d521-4e36-a798-c3cdaae410ca";
  const productionTrigger = "39f84250-5f4f-4a01-b70d-5b6277c23510";
  const sourceRef = "refs/heads/test/blueprint-native-rehearsal";
  const storeRef = "refs/heads/blueprint-changes";
  const host =
    "https://test-blueprint-native-rehearsal-volleybro-blueprint.andrewck24.workers.dev";
  const inputA = "a".repeat(40);
  const inputB = "b".repeat(40);
  const storeA = "c".repeat(40);
  const storeB = "d".repeat(40);
  const hookId = "66666666-6666-4666-8666-666666666666";
  let sourceSha = inputA;
  let storeSha = storeA;
  let pendingObserved = false;
  const builds = new Map();
  const requests = [];
  const events = [];
  let clock = 0;

  const coordinator = createNativeBuildCoordinator({
    mode: "rehearsal",
    triggerId: "55a112d3-d521-4e36-a798-c3cdaae410ca",
    hook: `https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/${hookId}`,
    account: "account",
    token: "read-token",
    worker: "blueprint-worker",
    fetchImpl: async (url, options = {}) => {
      const parsed = new URL(url);
      requests.push({ url: parsed.href, options });
      if (parsed.origin === host) {
        if (builds.size === 0) return new Response(null, { status: 404 });
        const build = [...builds.values()].at(-1);
        return new Response(
          JSON.stringify({
            sourceSha: build.sourceSha,
            integrationSha: build.sourceSha,
            storeSha: build.storeSha,
          }),
          { status: 200 },
        );
      }
      if (
        parsed.pathname.endsWith(`/deploy_hooks/${hookId}`) &&
        options.method !== "POST"
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              deploy_hook_uuid: hookId,
              external_script_id: "blueprint-worker",
              branch: "test/blueprint-native-rehearsal",
            },
          }),
          { status: 200 },
        );
      }
      if (options.method === "POST") {
        assert.match(parsed.href, new RegExp(`deploy_hooks/${hookId}$`));
        const uuid = `preview-${builds.size}`;
        builds.set(uuid, { sourceSha, storeSha });
        return new Response(
          JSON.stringify({ success: true, result: { build_uuid: uuid } }),
          { status: 200 },
        );
      }
      if (parsed.pathname.endsWith("/workers/blueprint-worker/builds")) {
        assert.equal(options.headers.Authorization, "Bearer read-token");
        return new Response(
          JSON.stringify({
            success: true,
            result: [
              {
                build_uuid: "production-build",
                status: "building",
                trigger: { trigger_uuid: productionTrigger },
              },
              {
                build_uuid: "previous-preview",
                status: "building",
                trigger: { trigger_uuid: previewTrigger },
              },
            ],
            result_info: { total_pages: 1 },
          }),
          { status: 200 },
        );
      }
      const uuid = decodeURIComponent(parsed.pathname.split("/").at(-1));
      if (uuid === "previous-preview") {
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              status: "stopped",
              build_outcome: "cancelled",
              trigger: { trigger_uuid: previewTrigger },
            },
          }),
          { status: 200 },
        );
      }
      if (uuid === "preview-0" && !pendingObserved) {
        pendingObserved = true;
        sourceSha = inputB;
        storeSha = storeB;
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              status: "building",
              trigger: { trigger_uuid: previewTrigger },
            },
          }),
          { status: 200 },
        );
      }
      assert.match(uuid, /^preview-/);
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            status: "stopped",
            build_outcome: "success",
            trigger: { trigger_uuid: previewTrigger },
          },
        }),
        { status: 200 },
      );
    },
    git: async () => ({
      stdout: `${sourceSha}\t${sourceRef}\n${storeSha}\t${storeRef}\n`,
    }),
    wait: async (ms) => {
      clock += ms;
    },
    now: () => clock,
    pollIntervalMs: 10,
    timeoutMs: 1_000,
    onEvent: (event) => events.push(event),
  });

  const result = await coordinator.run();

  assert.deepEqual(
    [...builds.values()],
    [
      { sourceSha: inputA, storeSha: storeA },
      { sourceSha: inputB, storeSha: storeB },
    ],
  );
  assert.equal(result.sourceSha, inputB);
  assert.equal(result.integrationSha, inputB);
  assert.equal(result.storeSha, storeB);
  assert.equal(
    requests.filter((request) =>
      request.url.startsWith(`${host}/blueprint-build.json?run=`),
    ).length,
    4,
  );
  assert.equal(
    requests.some((request) => request.url.includes("production-build")),
    false,
  );
  assert.deepEqual(
    events
      .filter((event) => event.type === "build-requested")
      .map((event) => event.build),
    ["preview-0", "preview-1"],
  );
});

test("native coordinator rejects targets outside the fixed production and rehearsal profiles", () => {
  const required = {
    mode: "rehearsal",
    triggerId: "55a112d3-d521-4e36-a798-c3cdaae410ca",
    hook: "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/66666666-6666-4666-8666-666666666666",
    account: "account",
    token: "read-token",
    worker: "blueprint-worker",
  };
  assert.throws(
    () =>
      createNativeBuildCoordinator({
        ...required,
        host: "https://unrelated.example",
      }),
    /Invalid rehearsal Blueprint coordinator target/,
  );
  assert.throws(
    () =>
      createNativeBuildCoordinator({
        ...required,
        hook: "https://unrelated.example/hook",
      }),
    /Invalid Cloudflare deploy hook URL/,
  );
  assert.throws(
    () =>
      createNativeBuildCoordinator({
        ...required,
        triggerId: "not-a-trigger-id",
      }),
    /Invalid Cloudflare build trigger ID/,
  );
});

test("native rehearsal refuses to POST a deploy hook bound to another branch", async () => {
  const calls = [];
  const coordinator = createNativeBuildCoordinator({
    mode: "rehearsal",
    triggerId: "55a112d3-d521-4e36-a798-c3cdaae410ca",
    hook: "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/66666666-6666-4666-8666-666666666666",
    account: "account",
    token: "read-token",
    worker: "blueprint-worker",
    fetchImpl: async (_url, options = {}) => {
      calls.push(options.method ?? "GET");
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            deploy_hook_uuid: "66666666-6666-4666-8666-666666666666",
            external_script_id: "blueprint-worker",
            branch: "main",
          },
        }),
        { status: 200 },
      );
    },
  });

  await assert.rejects(
    coordinator.run(),
    /not bound to the configured source branch/,
  );
  assert.deepEqual(calls, ["GET"]);
});
