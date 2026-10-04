#!/usr/bin/env node
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAIN_URL = "https://volleybro-blueprint.andrewck24.workers.dev";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The workflow owns the serial lock; a restarted job also drains builds left
// behind by an interrupted predecessor before it requests another deployment.
export async function coordinateRebuild({
  latest,
  receipt,
  active,
  wait,
  trigger,
}) {
  for (const build of await active()) await wait(build);
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
    CLOUDFLARE_BLUEPRINT_PRODUCTION_TRIGGER_ID: productionTrigger,
    CLOUDFLARE_BLUEPRINT_DEPLOY_HOOK: hook,
  } = process.env;
  if (![account, token, worker, productionTrigger, hook].every(Boolean)) {
    throw new Error("Blueprint coordinator configuration is incomplete");
  }
  if (
    !/^https:\/\/api\.cloudflare\.com\/client\/v4\/workers\/builds\/deploy_hooks\/[a-zA-Z0-9-]+$/.test(
      hook,
    )
  ) {
    throw new Error("Invalid Cloudflare deploy hook URL");
  }
  const deadline = Date.now() + 45 * 60_000;
  const request = async (url, options = {}) => {
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
  const wait = async (uuid) => {
    for (;;) {
      if (Date.now() >= deadline)
        throw new Error(`Timed out waiting for build ${uuid}`);
      const { result } = await api(`builds/${encodeURIComponent(uuid)}`);
      if (result.status === "stopped") {
        if (result.build_outcome !== "success")
          throw new Error(`Build ${uuid}: ${result.build_outcome}`);
        console.log(`Build ${uuid}: success`);
        return;
      }
      await sleep(10_000);
    }
  };
  const result = await coordinateRebuild({
    latest: async () => {
      const { stdout } = await execFileAsync("git", [
        "ls-remote",
        "origin",
        "refs/heads/main",
        "refs/heads/blueprint-changes",
      ]);
      const refs = new Map(
        stdout
          .trim()
          .split("\n")
          .map((line) => line.split(/\s+/).reverse()),
      );
      const sourceSha = refs.get("refs/heads/main");
      const storeSha = refs.get("refs/heads/blueprint-changes");
      if (
        ![sourceSha, storeSha].every((sha) => /^[0-9a-f]{40}$/.test(sha ?? ""))
      )
        throw new Error("Missing Blueprint input refs");
      return { sourceSha, storeSha };
    },
    receipt: async () => {
      const response = await fetch(
        `${MAIN_URL}/blueprint-build.json?run=${Date.now()}`,
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
            build.trigger?.trigger_uuid === productionTrigger &&
            build.status !== "stopped"
          )
            builds.push(build.build_uuid);
        }
      }
      return builds;
    },
    wait,
    trigger: async () => {
      if (Date.now() >= deadline)
        throw new Error("Blueprint coordinator deadline exceeded");
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
