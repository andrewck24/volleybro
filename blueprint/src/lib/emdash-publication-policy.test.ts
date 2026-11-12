jest.mock(
  "emdash",
  () => ({
    definePlugin: (descriptor: unknown) => descriptor,
  }),
  { virtual: true },
);
jest.mock(
  "astro/zod",
  () => ({ z: jest.requireActual<typeof import("zod")>("zod").z }),
  { virtual: true },
);

import {
  createPlugin,
  MAX_MEDIA_UPLOAD_BYTES,
} from "./emdash-publication-policy";

describe("canonical content publish policy", () => {
  const plugin = createPlugin() as unknown as {
    hooks: Record<string, (...args: unknown[]) => Promise<unknown>>;
  };
  const beforePublish = plugin.hooks["content:beforePublish"];
  const content = {
    title: "Canonical Change",
    linear_issue: "ATE-306",
    pull_requests: [],
    blocks: [],
  };

  it("does not validate drafts on save, so incomplete drafts autosave", () => {
    expect(plugin.hooks["content:beforeSave"]).toBeUndefined();
  });

  it("publishes a valid Change without any Linear call", async () => {
    await expect(
      beforePublish(
        {
          collection: "blueprint_changes",
          content: { data: content, draftRevisionId: "revision-1" },
        },
        {},
      ),
    ).resolves.toBeUndefined();
    await expect(
      beforePublish(
        {
          collection: "blueprint_changes",
          content: {
            data: { title: "No issue", pull_requests: [], blocks: [] },
            draftRevisionId: "revision-1",
          },
        },
        {},
      ),
    ).resolves.toBeUndefined();
  });

  it("logs a failed build hook without exposing its secret URL or thrown error", async () => {
    const secretUrl =
      "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-4000-8000-000000000001";
    const thrownDetails = "upstream response included private request data";
    const logs: unknown[][] = [];
    await plugin.hooks["content:afterPublish"](
      { collection: "blueprint_changes" },
      {
        settings: { get: async () => secretUrl },
        http: {
          fetch: async () => {
            throw new Error(`${secretUrl} ${thrownDetails}`);
          },
        },
        log: {
          error: (...args: unknown[]) => logs.push(args),
          info: (...args: unknown[]) => logs.push(args),
          warn: (...args: unknown[]) => logs.push(args),
        },
      },
    );

    const output = JSON.stringify(logs);
    expect(output).toContain("Blueprint build hook request failed");
    expect(output).not.toContain(secretUrl);
    expect(output).not.toContain(thrownDetails);
  });

  it.each([
    [
      "Markdown strings",
      { _type: "markdown", _version: 1, markdown: "**raw**" },
    ],
    ["raw HTML blocks", { _type: "html", html: "<script>alert(1)</script>" }],
    ["iframes", { _type: "iframe", url: "https://example.com" }],
    ["unknown blocks", { _type: "unknown_block", value: "payload" }],
  ])("blocks publication of %s", async (_label, block) => {
    await expect(
      beforePublish(
        {
          collection: "blueprint_changes",
          content: {
            data: { ...content, blocks: [block] },
            draftRevisionId: "revision-1",
          },
        },
        {},
      ),
    ).resolves.toEqual({
      cancel: true,
      reason: "Change content does not match the published EmDash schema.",
    });
  });
});

describe("media upload size cap", () => {
  const plugin = createPlugin() as unknown as {
    hooks: Record<string, (event: unknown) => Promise<unknown>>;
  };
  const beforeUpload = plugin.hooks["media:beforeUpload"];
  const file = (size: number) => ({ name: "a.png", type: "image/png", size });

  it("passes a file at the cap and rejects one above it", async () => {
    const atCap = file(MAX_MEDIA_UPLOAD_BYTES);
    await expect(beforeUpload({ file: atCap })).resolves.toBe(atCap);
    await expect(
      beforeUpload({ file: file(MAX_MEDIA_UPLOAD_BYTES + 1) }),
    ).rejects.toThrow("20 MiB");
  });
});
