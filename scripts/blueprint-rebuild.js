#!/usr/bin/env node
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAIN_URL = "https://volleybro-blueprint.andrewck24.workers.dev";
const WORKER_NAME = "volleybro-blueprint";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The caller owns serialization. A restarted coordinator also drains builds
// left behind by its interrupted predecessor before it requests another.
export async function coordinateRebuild({
  latest,
  receipt,
  active,
  wait,
  trigger,
}) {
  for (const build of await active())
    await wait(build, { requireSuccess: false });
  for (;;) {
    const wanted = await latest();
    const deployed = await receipt();
    if (
      deployed?.sourceSha === wanted.sourceSha &&
      deployed?.integrationSha === wanted.sourceSha &&
      deployed?.storeSha === wanted.storeSha
    )
      return deployed;
    const build = await trigger();
    await wait(build);
    const observed = await receipt();
    const newest = await latest();
    if (
      observed?.sourceSha === newest.sourceSha &&
      observed?.integrationSha === newest.sourceSha &&
      observed?.storeSha === newest.storeSha
    )
      return observed;
    if (
      newest.sourceSha === wanted.sourceSha &&
      newest.storeSha === wanted.storeSha
    )
      throw new Error(
        `Build ${build} completed without the requested input receipt`,
      );
  }
}

async function run() {
  const {
    CLOUDFLARE_ACCOUNT_ID: account,
    CLOUDFLARE_BLUEPRINT_BUILD_READ_TOKEN: token,
    CLOUDFLARE_BLUEPRINT_WORKER_ID: worker,
    CLOUDFLARE_BLUEPRINT_PRODUCTION_TRIGGER_ID: triggerId,
    CLOUDFLARE_BLUEPRINT_DEPLOY_HOOK: hook,
  } = process.env;
  if (![account, token, worker, triggerId, hook].every(Boolean)) {
    throw new Error("Blueprint coordinator configuration is incomplete");
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      triggerId,
    )
  ) {
    throw new Error("Invalid Cloudflare build trigger ID");
  }
  if (
    !/^https:\/\/api\.cloudflare\.com\/client\/v4\/workers\/builds\/deploy_hooks\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      hook,
    )
  ) {
    throw new Error("Invalid Cloudflare deploy hook URL");
  }

  const sourceRef = "refs/heads/main";
  const storeRef = "refs/heads/blueprint-changes";
  const host = MAIN_URL;
  const deadline = Date.now() + 45 * 60_000;
  const assertBeforeDeadline = (label) => {
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for ${label}`);
  };
  const request = async (url, options = {}) => {
    assertBeforeDeadline("request");
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      throw new Error(`Cloudflare request failed (${response.status})`);
    const body = await response.json();
    if (body.success !== true)
      throw new Error("Cloudflare request was unsuccessful");
    return body;
  };
  const api = (suffix) =>
    request(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/builds/${suffix}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  const hookId = hook.slice(hook.lastIndexOf("/") + 1);
  const sourceBranch = "main";
  const verifyDeployHook = async () => {
    const { result } = await api(
      `workers/${WORKER_NAME}/deploy_hooks/${encodeURIComponent(hookId)}`,
    );
    if (
      result.deploy_hook_uuid !== hookId ||
      result.external_script_id !== worker ||
      result.branch !== sourceBranch
    ) {
      throw new Error(
        "Cloudflare deploy hook is not bound to the configured source branch",
      );
    }
  };

  const waitForBuild = async (uuid, { requireSuccess = true } = {}) => {
    for (;;) {
      assertBeforeDeadline(`build ${uuid}`);
      const { result } = await api(`builds/${encodeURIComponent(uuid)}`);
      if (result.status === "stopped") {
        if (result.trigger?.trigger_uuid !== triggerId) {
          throw new Error(`Build ${uuid} did not use the configured trigger`);
        }
        if (requireSuccess && result.build_outcome !== "success")
          throw new Error(`Build ${uuid}: ${result.build_outcome}`);
        console.log(`Build ${uuid}: ${result.build_outcome}`);
        return;
      }
      await sleep(10_000);
    }
  };

  await verifyDeployHook();
  const result = await coordinateRebuild({
    latest: async () => {
      assertBeforeDeadline("input refs");
      const { stdout } = await execFileAsync("git", [
        "ls-remote",
        "origin",
        sourceRef,
        storeRef,
      ]);
      const refs = new Map(
        stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => line.split(/\s+/).reverse()),
      );
      const sourceSha = refs.get(sourceRef);
      const storeSha = refs.get(storeRef);
      if (
        ![sourceSha, storeSha].every((sha) => /^[0-9a-f]{40}$/.test(sha ?? ""))
      ) {
        throw new Error("Missing Blueprint input refs");
      }
      return { sourceSha, storeSha };
    },
    receipt: async () => {
      assertBeforeDeadline("hosted receipt");
      const response = await fetch(
        `${host}/blueprint-build.json?run=${Date.now()}`,
        { cache: "no-store", signal: AbortSignal.timeout(30_000) },
      );
      if (response.status === 404) return null;
      if (!response.ok)
        throw new Error(`Cannot read deployed receipt (${response.status})`);
      return response.json();
    },
    active: async () => {
      const builds = [];
      for (let page = 1, pages = 1; page <= pages; page += 1) {
        const body = await api(
          `workers/${encodeURIComponent(worker)}/builds?per_page=200&page=${page}`,
        );
        pages = body.result_info?.total_pages ?? 1;
        for (const build of body.result) {
          if (
            build.trigger?.trigger_uuid === triggerId &&
            build.status !== "stopped"
          ) {
            builds.push(build.build_uuid);
          }
        }
      }
      return builds;
    },
    wait: waitForBuild,
    trigger: async () => {
      assertBeforeDeadline("trigger");
      const body = await request(hook, { method: "POST" });
      if (!body.result?.build_uuid)
        throw new Error("Deploy hook returned no build UUID");
      console.log(`Requested build ${body.result.build_uuid}`);
      return body.result.build_uuid;
    },
  });
  console.log(`Deployed source=${result.sourceSha} store=${result.storeSha}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await run();
