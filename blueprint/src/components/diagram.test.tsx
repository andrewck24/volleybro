import { render, screen } from "@testing-library/react";

import { blockSchema } from "../lib/emdash-change-record";
import type { DiagramBlock } from "../lib/diagram-schema";
import { Diagram } from "./diagram";

const diagram = {
  _type: "diagram",
  _version: 1,
  title: "Runtime data flow",
  description: "A typed source diagram.",
  viewBox: { x: -20, y: 0, width: 240, height: 120 },
  anchors: [{ id: "３月-note", x: 12, y: 18 }],
  elements: [
    {
      type: "group",
      id: "source-group",
      transform: [{ type: "translate", x: 2, y: 3 }],
      children: [
        {
          type: "rect",
          id: "node-one",
          x: 10,
          y: 20,
          width: 80,
          height: 36,
          rx: 4,
          fill: "card",
          stroke: "#123456",
          strokeWidth: 2,
        },
        {
          type: "path",
          id: "edge-one",
          commands: [
            { op: "M", values: [90, 38] },
            { op: "C", values: [110, 38, 120, 74, 140, 74] },
          ],
          stroke: "primary",
          strokeWidth: 2,
          arrowEnd: true,
        },
        {
          type: "text",
          id: "３label",
          x: 16,
          y: 42,
          text: "<script>not executable</script> & label",
          fontSize: 12,
          fontFamily: "sans",
          fontWeight: 600,
          textAnchor: "middle",
          dominantBaseline: "middle",
        },
      ],
    },
  ],
} as const;

describe("diagram v1 block", () => {
  it("keeps typed geometry, source IDs, arrow markers, and escaped labels", () => {
    const parsed = blockSchema.safeParse(diagram);
    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data._type !== "diagram") return;

    render(<Diagram diagram={parsed.data as DiagramBlock} />);
    const svg = screen.getByRole("img", { name: "Runtime data flow" });
    expect(svg).toHaveAttribute("viewBox", "-20 0 240 120");
    expect(svg.querySelector("[id='３月-note']")).toBeInTheDocument();
    expect(svg.querySelector("[id='３label']")).toHaveTextContent(
      "<script>not executable</script> & label",
    );
    expect(svg.querySelector("script")).not.toBeInTheDocument();
    expect(svg.querySelector("rect")).toHaveAttribute("fill", "var(--card)");
    expect(svg.querySelector("[id='edge-one']")).toHaveAttribute(
      "d",
      "M90 38 C110 38 120 74 140 74",
    );
    expect(svg.querySelector("[id='edge-one']")).toHaveAttribute(
      "marker-end",
      expect.stringMatching(/^url\(#diagram-arrow-/u),
    );
    expect(svg.querySelector("text")).toHaveAttribute("text-anchor", "middle");
  });

  it("preserves positioned text runs and source marker geometry", () => {
    const parsed = blockSchema.safeParse({
      ...diagram,
      preserveAspectRatio: { align: "xMidYMid", mode: "meet" },
      markers: [
        {
          id: "source-arrow",
          viewBox: { x: 0, y: 0, width: 8, height: 6 },
          width: 8,
          height: 6,
          refX: 7,
          refY: 3,
          orient: "auto",
          path: [
            { op: "M", values: [0, 0] },
            { op: "L", values: [8, 3] },
            { op: "L", values: [0, 6] },
            { op: "Z", values: [] },
          ],
          fill: "warningMuted",
        },
      ],
      elements: [
        {
          type: "path",
          markerEnd: "source-arrow",
          commands: [
            { op: "M", values: [1, 2] },
            { op: "L", values: [3, 4] },
          ],
        },
        {
          type: "text",
          x: 0,
          y: 0,
          text: "",
          letterSpacing: 0.6,
          runs: [
            { id: "line-１", text: "first <label>", x: 10, y: 20 },
            { text: "second", x: 10, y: 40, fontFamily: "mono" },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data._type !== "diagram") return;

    render(<Diagram diagram={parsed.data as DiagramBlock} />);
    const svg = screen.getByRole("img", { name: "Runtime data flow" });
    expect(svg).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
    expect(svg.querySelector("marker#source-arrow path")).toHaveAttribute(
      "d",
      "M0 0 L8 3 L0 6 Z",
    );
    expect(svg.querySelector("[id='line-１']")).toHaveAttribute("y", "20");
    expect(svg.querySelector("[id='line-１']")).toHaveTextContent(
      "first <label>",
    );
    expect(svg.querySelector("text")).toHaveAttribute("letter-spacing", "0.6");
  });

  it.each([
    ["unknown event attributes", { onload: "alert(1)" }],
    ["raw style attributes", { style: "fill:url(javascript:alert(1))" }],
    ["interactive ARIA state", { tabIndex: 0, "aria-pressed": false }],
    ["URL paint values", { fill: "url(#external-paint)" }],
  ])("rejects %s", (_name, extra) => {
    const candidate = {
      ...diagram,
      elements: [
        {
          type: "rect",
          x: 0,
          y: 0,
          width: 40,
          height: 20,
          ...extra,
        },
      ],
    };
    expect(blockSchema.safeParse(candidate).success).toBe(false);
  });

  it("rejects raw SVG path data strings", () => {
    expect(
      blockSchema.safeParse({
        ...diagram,
        elements: [
          {
            type: "path",
            commands: [{ op: "M", values: [1, 2] }],
            d: "M 1 2<script>",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it.each([
    {
      type: "path",
      commands: [{ op: "C", values: [1, 2, 3] }],
    },
    {
      type: "path",
      commands: [{ op: "A", values: [1, 2, 0, 2, 0, 3, 4] }],
    },
    { type: "rect", x: 0, y: 0, width: -1, height: 20 },
    {
      type: "group",
      transform: [{ type: "rotate", angle: 30, cx: 2 }],
      children: [{ type: "circle", cx: 0, cy: 0, r: 2 }],
    },
  ])("rejects invalid numeric geometry %#", (element) => {
    expect(
      blockSchema.safeParse({ ...diagram, elements: [element] }).success,
    ).toBe(false);
  });
});
