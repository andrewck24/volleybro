jest.mock("next/og", () => ({
  ImageResponse: jest.fn((_elem, opts) => {
    const res = new Response(null, { status: 200 });
    Object.defineProperty(res, "headers", {
      value: new Headers({
        "content-type": "image/png",
        "cache-control": opts?.headers?.["Cache-Control"] ?? "",
      }),
    });
    return res;
  }),
}));

import { GET } from "../[size]/route";

function makeParams(size: string) {
  return { params: Promise.resolve({ size }) };
}

describe("GET /apple-splash/[size]", () => {
  it("returns 200 for a supported size", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("1290x2796"));
    expect(res.status).toBe(200);
  });

  it("sets Cache-Control: immutable on supported size", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("1290x2796"));
    expect(res.headers.get("cache-control")).toContain("immutable");
  });

  it("returns 404 for an unsupported size", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("100x100"));
    expect(res.status).toBe(404);
  });

  it("returns 404 for a malformed size segment", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("bad"));
    expect(res.status).toBe(404);
  });
});
