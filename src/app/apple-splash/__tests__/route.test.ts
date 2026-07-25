import type { ReactElement } from "react";
import { collect } from "@/test-utils/svg-tree";

let lastElem: ReactElement | undefined;

jest.mock("next/og", () => ({
  ImageResponse: jest.fn((elem, opts) => {
    lastElem = elem;
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
import {
  V_ARM_LEFT,
  V_ARM_RIGHT,
  V_VIEWBOX,
} from "@/components/brand/logo-symbol";
import {
  TYPE_ARM_LEFT,
  TYPE_ARM_RIGHT,
  TYPE_LETTERS,
  TYPE_VIEWBOX,
} from "@/components/brand/logo-type";

function makeParams(size: string) {
  return { params: Promise.resolve({ size }) };
}

describe("GET /apple-splash/[size]", () => {
  it("returns 200 for a supported size", async () => {
    const res = await GET(
      new Request("http://localhost"),
      makeParams("1290x2796"),
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for the iPhone 17 Pro splash size", async () => {
    const res = await GET(
      new Request("http://localhost"),
      makeParams("1206x2622"),
    );
    expect(res.status).toBe(200);
  });

  it("sets Cache-Control: immutable on supported size", async () => {
    const res = await GET(
      new Request("http://localhost"),
      makeParams("1290x2796"),
    );
    expect(res.headers.get("cache-control")).toContain("immutable");
  });

  it("returns 404 for an unsupported size", async () => {
    const res = await GET(
      new Request("http://localhost"),
      makeParams("100x100"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for a malformed size segment", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("bad"));
    expect(res.status).toBe(404);
  });

  it("composes the mark from the shared V_VIEWBOX/arm constants, sized to 25% of the shorter side", async () => {
    await GET(new Request("http://localhost"), makeParams("1290x2796"));

    const svgs = collect(lastElem, "svg");
    const markSvg = svgs.find((svg) => svg.props.viewBox === V_VIEWBOX);
    expect(markSvg).toBeDefined();
    expect(markSvg?.props.width).toBe(Math.round(0.25 * 1290));

    const paths = collect(markSvg, "path");
    expect(paths.map((p) => p.props.d)).toEqual([V_ARM_LEFT, V_ARM_RIGHT]);
  });

  it("composes the wordmark from the shared logo-type constants, sized to 40% of the shorter side, bottom-inset 6% of height", async () => {
    await GET(new Request("http://localhost"), makeParams("1290x2796"));

    const svgs = collect(lastElem, "svg");
    const typeSvg = svgs.find((svg) => svg.props.viewBox === TYPE_VIEWBOX);
    expect(typeSvg).toBeDefined();

    const expectedWidth = Math.round(0.4 * Math.min(1290, 2796));
    const [, , vbWidth, vbHeight] = TYPE_VIEWBOX.split(" ").map(Number) as [
      number,
      number,
      number,
      number,
    ];
    const expectedHeight = Math.round((expectedWidth * vbHeight) / vbWidth);
    expect(typeSvg?.props.width).toBe(expectedWidth);
    expect(typeSvg?.props.height).toBe(expectedHeight);

    const paths = collect(typeSvg, "path");
    expect(paths.map((p) => p.props.d)).toEqual([
      TYPE_ARM_LEFT,
      TYPE_ARM_RIGHT,
      ...TYPE_LETTERS,
    ]);
  });
});
