import type { HttpAccess } from "emdash";

const DEPLOY_HOOK_UUID_PATTERN =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu;
const DEPLOY_HOOK_PATH_PATTERN =
  /^\/client\/v4\/workers\/builds\/deploy_hooks\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/iu;

export interface TriggeredCloudflareBuild {
  buildUuid: string;
  alreadyExists: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDeployHookUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Cloudflare Deploy Hook URL is invalid.");
  }

  const pathMatch = DEPLOY_HOOK_PATH_PATTERN.exec(url.pathname);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.cloudflare.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !pathMatch?.[1] ||
    !DEPLOY_HOOK_UUID_PATTERN.test(pathMatch[1])
  ) {
    throw new Error("Cloudflare Deploy Hook URL is not an allowed endpoint.");
  }

  return url;
}

export async function triggerCloudflareDeployHook(
  deployHookUrl: string,
  http: Pick<HttpAccess, "fetch">,
): Promise<TriggeredCloudflareBuild> {
  const url = parseDeployHookUrl(deployHookUrl);
  const response = await http.fetch(url.href, {
    method: "POST",
    redirect: "manual",
  });

  if (!response.ok) {
    throw new Error(`Cloudflare Deploy Hook returned HTTP ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Cloudflare Deploy Hook returned invalid JSON.");
  }

  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.result)
  ) {
    throw new Error("Cloudflare Deploy Hook did not confirm a build request.");
  }

  const { build_uuid: buildUuid, already_exists: alreadyExists } =
    payload.result;
  if (
    typeof buildUuid !== "string" ||
    !DEPLOY_HOOK_UUID_PATTERN.test(buildUuid) ||
    (alreadyExists !== undefined && typeof alreadyExists !== "boolean")
  ) {
    throw new Error("Cloudflare Deploy Hook returned an invalid build result.");
  }

  return { buildUuid, alreadyExists: alreadyExists === true };
}
