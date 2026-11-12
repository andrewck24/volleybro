jest.mock(
  "astro:middleware",
  () => ({ defineMiddleware: (handler: unknown) => handler }),
  { virtual: true },
);

import { onRequest } from "./middleware";

const request = (body: unknown, path = "/_emdash/api/mcp") =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const call = (
  tool: string,
  argumentsValue: Record<string, unknown>,
): unknown => ({
  jsonrpc: "2.0",
  id: 7,
  method: "tools/call",
  params: { name: tool, arguments: argumentsValue },
});

describe("MCP Portable Text write boundary", () => {
  const next = jest.fn(async () => new Response("continued"));
  const middleware = onRequest as unknown as (
    context: { request: Request },
    next: () => Promise<Response>,
  ) => Promise<Response>;

  beforeEach(() => next.mockClear());

  it.each(["content_create", "content_update"])(
    "rejects Markdown-string blocks passed to %s for Blueprint Changes",
    async (tool) => {
      const response = await middleware(
        {
          request: request(
            call(tool, {
              collection: "blueprint_changes",
              data: { blocks: "# This would be converted before save" },
            }),
          ),
        },
        next,
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        jsonrpc: "2.0",
        id: 7,
        error: { code: -32602 },
      });
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("allows array payloads and leaves the original body readable downstream", async () => {
    const input = request(
      call("content_create", {
        collection: "blueprint_changes",
        data: { blocks: [{ _type: "block", children: [] }] },
      }),
    );
    const downstream = jest.fn(async () => {
      expect(await input.json()).toMatchObject({ method: "tools/call" });
      return new Response("continued");
    });

    await expect(
      middleware({ request: input }, downstream),
    ).resolves.toHaveProperty("status", 200);
    expect(downstream).toHaveBeenCalledTimes(1);
  });

  it("allows updates that omit blocks so existing values remain unchanged", async () => {
    await expect(
      middleware(
        {
          request: request(
            call("content_update", {
              collection: "blueprint_changes",
              data: { title: "Updated title" },
            }),
          ),
        },
        next,
      ),
    ).resolves.toHaveProperty("status", 200);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "an unrelated collection",
      "content_create",
      "posts",
      { blocks: "**markdown**" },
    ],
    [
      "an unrelated tool",
      "content_get",
      "blueprint_changes",
      { blocks: "**markdown**" },
    ],
  ])("passes through %s", async (_label, tool, collection, data) => {
    await expect(
      middleware({ request: request(call(tool, { collection, data })) }, next),
    ).resolves.toHaveProperty("status", 200);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("passes through MCP requests on other paths", async () => {
    await expect(
      middleware(
        {
          request: request(
            call("content_create", {
              collection: "blueprint_changes",
              data: { blocks: "**markdown**" },
            }),
            "/health",
          ),
        },
        next,
      ),
    ).resolves.toHaveProperty("status", 200);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
