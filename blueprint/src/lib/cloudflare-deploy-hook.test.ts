import { triggerCloudflareDeployHook } from "./cloudflare-deploy-hook";

const validDeployHookUrl =
  "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-4000-8000-000000000001";
const buildUuid = "10000000-0000-4000-8000-000000000001";

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("triggerCloudflareDeployHook", () => {
  it("POSTs the official hook URL and returns the accepted build identity", async () => {
    const fetch = jest.fn(async () =>
      response({
        success: true,
        result: { build_uuid: buildUuid, already_exists: true },
      }),
    );

    await expect(
      triggerCloudflareDeployHook(validDeployHookUrl, { fetch }),
    ).resolves.toEqual({ buildUuid, alreadyExists: true });
    expect(fetch).toHaveBeenCalledWith(validDeployHookUrl, {
      method: "POST",
      redirect: "manual",
    });
  });

  it.each([
    "http://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-4000-8000-000000000001",
    "https://not-api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-4000-8000-000000000001",
    "https://api.cloudflare.com/client/v4/accounts/00000000000000000000000000000000/builds/triggers/00000000-0000-4000-8000-000000000001/deploy",
    "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-4000-8000-000000000001/extra",
    `${validDeployHookUrl}?branch=main`,
    `https://user:pass@${validDeployHookUrl.slice("https://".length)}`,
  ])(
    "rejects a URL outside the official hook endpoint contract: %s",
    async (url) => {
      const fetch = jest.fn();

      await expect(
        triggerCloudflareDeployHook(url, { fetch }),
      ).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects non-success HTTP responses without including the secret URL", async () => {
    const fetch = jest.fn(async () => response({}, 503));

    const error = await triggerCloudflareDeployHook(validDeployHookUrl, {
      fetch,
    }).catch((reason: unknown) => String(reason));

    expect(error).toContain("HTTP 503");
    expect(error).not.toContain(validDeployHookUrl);
  });

  it("rejects a success-status response that does not confirm a build", async () => {
    const fetch = jest.fn(async () =>
      response({ success: false, result: { build_uuid: buildUuid } }),
    );

    await expect(
      triggerCloudflareDeployHook(validDeployHookUrl, { fetch }),
    ).rejects.toThrow("did not confirm a build request");
  });
});
