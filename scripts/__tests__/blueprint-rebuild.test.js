import assert from "node:assert/strict";
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
