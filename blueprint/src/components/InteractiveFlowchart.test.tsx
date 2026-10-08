import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InteractiveFlowchart } from "./InteractiveFlowchart";

const nodes = [
  { id: "a", label: "Node A", x: 50, y: 50 },
  { id: "b", label: "Node B", x: 150, y: 50 },
];

const details: Record<string, { title: string; body: string }> = {
  a: { title: "Detail A", body: "Body of A" },
  b: { title: "Detail B", body: "Body of B" },
};

interface Point {
  x: number;
  y: number;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function sampleLineSegment(start: Point, end: Point) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(end.x - start.x, end.y - start.y)),
  );
  return Array.from({ length: steps }, (_, index) => {
    const ratio = (index + 1) / steps;
    return {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
    };
  });
}

function svgEdgeSamples(edge: Element) {
  if (edge.tagName.toLowerCase() === "line") {
    return sampleLineSegment(
      {
        x: Number(edge.getAttribute("x1")),
        y: Number(edge.getAttribute("y1")),
      },
      {
        x: Number(edge.getAttribute("x2")),
        y: Number(edge.getAttribute("y2")),
      },
    );
  }

  const tokens =
    edge.getAttribute("d")?.match(/[MLC]|-?(?:\d+\.?\d*|\.\d+)/gu) ?? [];
  const points: Point[] = [];
  let current: Point | null = null;
  let index = 0;

  while (index < tokens.length) {
    const command = tokens[index++];
    if (command === "M" || command === "L") {
      const next = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
      if (current) points.push(...sampleLineSegment(current, next));
      else points.push(next);
      current = next;
      continue;
    }
    if (command !== "C" || !current) throw new Error("Unsupported edge path");

    const control1 = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
    const control2 = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
    const end = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
    const start = current;
    const steps = Math.ceil(
      3 *
        (Math.hypot(control1.x - start.x, control1.y - start.y) +
          Math.hypot(control2.x - control1.x, control2.y - control1.y) +
          Math.hypot(end.x - control2.x, end.y - control2.y)),
    );
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const inverseT = 1 - t;
      points.push({
        x:
          inverseT ** 3 * start.x +
          3 * inverseT ** 2 * t * control1.x +
          3 * inverseT * t ** 2 * control2.x +
          t ** 3 * end.x,
        y:
          inverseT ** 3 * start.y +
          3 * inverseT ** 2 * t * control1.y +
          3 * inverseT * t ** 2 * control2.y +
          t ** 3 * end.y,
      });
    }
    current = end;
  }

  return points;
}

function isPointInsideRect(point: Point, rect: Rect) {
  return (
    point.x > rect.left &&
    point.x < rect.right &&
    point.y > rect.top &&
    point.y < rect.bottom
  );
}

function svgNodeRect(node: Element): Rect {
  // SVG geometry is the behavior under test; role queries alone cannot expose these bounds.
  // eslint-disable-next-line testing-library/no-node-access
  const rect = node.querySelector("rect");
  expect(rect).not.toBeNull();
  const left = Number(rect?.getAttribute("x"));
  const top = Number(rect?.getAttribute("y"));
  return {
    left,
    right: left + Number(rect?.getAttribute("width")),
    top,
    bottom: top + Number(rect?.getAttribute("height")),
  };
}

describe("InteractiveFlowchart", () => {
  it("renders all node labels", () => {
    render(<InteractiveFlowchart nodes={nodes} details={details} />);
    expect(screen.getByText("Node A")).toBeInTheDocument();
    expect(screen.getByText("Node B")).toBeInTheDocument();
  });

  it("wraps CJK text and unbroken secret labels into visible lines", () => {
    const label = "資料流程VERCEL_BLUEPRINT_PREVIEW_DEPLOY_TOKEN";
    render(
      <InteractiveFlowchart
        nodes={[{ id: "long", label, x: 140, y: 70, w: 160 }]}
        details={details}
      />,
    );

    const node = screen.getByRole("button");
    const lines = within(node).getAllByText(/\S/u, { selector: "tspan" });

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map((line) => line.textContent).join("")).toBe(label);
  });

  it("wraps long English labels between words", () => {
    const label = "A long English label with several words";
    render(
      <InteractiveFlowchart
        nodes={[{ id: "long", label, x: 140, y: 70, w: 120 }]}
        details={details}
      />,
    );

    const node = screen.getByRole("button");
    const lines = within(node).getAllByText(/\S/u, { selector: "tspan" });

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map((line) => line.textContent).join(" ")).toBe(label);
  });

  it("keeps expanded nodes separate and anchors edges to their laid-out bounds", () => {
    render(
      <InteractiveFlowchart
        nodes={[
          {
            id: "first",
            label: "VERCEL_BLUEPRINT_PREVIEW_DEPLOY_TOKEN",
            x: 140,
            y: 70,
            w: 160,
          },
          { id: "second", label: "下一個狀態", x: 140, y: 70, w: 160 },
        ]}
        edges={[{ from: "first", to: "second" }]}
        details={details}
      />,
    );

    const svg = screen.getByRole("img");
    const nodeBounds = within(svg)
      .getAllByRole("button")
      .map((group) => {
        // SVG geometry is the behavior under test; role queries alone cannot expose these bounds.
        // eslint-disable-next-line testing-library/no-node-access
        const rect = group.querySelector("rect");
        expect(rect).not.toBeNull();
        return {
          x: Number(rect?.getAttribute("x")),
          y: Number(rect?.getAttribute("y")),
          width: Number(rect?.getAttribute("width")),
          height: Number(rect?.getAttribute("height")),
        };
      });
    const [first, second] = nodeBounds;

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.y + first!.height).toBeLessThanOrEqual(second!.y);

    const edge = within(svg).getByRole("presentation");
    expect(Number(edge.getAttribute("x1"))).toBe(first!.x + first!.width / 2);
    expect(Number(edge.getAttribute("y1"))).toBe(first!.y + first!.height);
    expect(Number(edge.getAttribute("x2"))).toBe(second!.x + second!.width / 2);
    expect(Number(edge.getAttribute("y2"))).toBe(second!.y);

    const [viewX, viewY, viewWidth, viewHeight] = svg
      .getAttribute("viewBox")!
      .split(/\s+/u)
      .map(Number);
    for (const bounds of nodeBounds) {
      expect(bounds.x).toBeGreaterThanOrEqual(viewX!);
      expect(bounds.y).toBeGreaterThanOrEqual(viewY!);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewX! + viewWidth!);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        viewY! + viewHeight!,
      );
    }
  });

  it.each([
    {
      scenario: "a non-endpoint node",
      nodes: [
        { id: "first", label: "First", x: 140, y: 70 },
        { id: "middle", label: "Middle", x: 140, y: 70 },
        { id: "last", label: "Last", x: 140, y: 70 },
      ],
      edgeSpec: { from: "first", to: "last" },
      obstacleIndexes: [1],
    },
    {
      scenario: "a dense node layout",
      nodes: [
        { id: "center", label: "Center", x: 0, y: 0, w: 100 },
        { id: "top", label: "Top", x: 0, y: -60, w: 100 },
        { id: "bottom", label: "Bottom", x: 0, y: 60, w: 100 },
        { id: "left", label: "Left", x: -112, y: 0, w: 100 },
        { id: "right", label: "Right", x: 112, y: 0, w: 100 },
        { id: "target", label: "Target", x: 224, y: 0, w: 100 },
      ],
      edgeSpec: { from: "center", to: "target" },
      obstacleIndexes: [1, 2, 3, 4],
    },
  ])(
    "keeps the edge clear of $scenario",
    ({ nodes, edgeSpec, obstacleIndexes }) => {
      render(
        <InteractiveFlowchart
          nodes={nodes}
          edges={[edgeSpec]}
          details={details}
        />,
      );

      const svg = screen.getByRole("img");
      const nodeButtons = within(svg).getAllByRole("button");
      const edge = within(svg).getByRole("presentation");
      const edgeSamples = svgEdgeSamples(edge);
      expect(edgeSamples.length).toBeGreaterThan(1);

      for (const obstacleIndex of obstacleIndexes) {
        const nodeBounds = svgNodeRect(nodeButtons[obstacleIndex]!);
        for (const point of edgeSamples) {
          const isInsideNode = isPointInsideRect(point, nodeBounds);
          expect(isInsideNode).toBe(false);
        }
      }
    },
  );

  it("keeps wrapped diamond labels inside the diamond polygon", () => {
    const label = "資料流程驗證資料流程驗證";
    render(
      <InteractiveFlowchart
        nodes={[
          {
            id: "decision",
            label,
            x: 140,
            y: 70,
            w: 120,
            h: 48,
            shape: "diamond",
          },
        ]}
        details={details}
      />,
    );

    const node = screen.getByRole("button");
    // SVG geometry is the behavior under test; role queries alone cannot expose the polygon.
    // eslint-disable-next-line testing-library/no-node-access
    const polygon = node.querySelector("polygon");
    expect(polygon).not.toBeNull();
    const vertices = polygon!
      .getAttribute("points")!
      .split(" ")
      .map((point) => point.split(",").map(Number));
    const centerY =
      vertices[0]![1]! + (vertices[2]![1]! - vertices[0]![1]!) / 2;
    const shapeWidth = vertices[1]![0]! - vertices[3]![0]!;
    const shapeHeight = vertices[2]![1]! - vertices[0]![1]!;
    const lines = within(node).getAllByText(/\S/u, { selector: "tspan" });

    expect(lines.map((line) => line.textContent).join("")).toBe(label);
    for (const line of lines) {
      const textWidth = Array.from(line.textContent ?? "").length * 13;
      const lineCenterY = Number(line.getAttribute("y"));
      const glyphHalfHeight = 6.5;
      const availableWidth =
        shapeWidth *
        (1 -
          (2 * (Math.abs(lineCenterY - centerY) + glyphHalfHeight)) /
            shapeHeight);
      expect(textWidth + 16).toBeLessThanOrEqual(availableWidth + 0.01);
    }
  });

  it("routes an explicitly curved edge outside the nodes and keeps default edges straight", () => {
    const routedNodes = [
      { id: "qa", label: "QA", x: 50, y: 150, w: 80, h: 40 },
      { id: "blocker", label: "Blocker", x: 50, y: 75, w: 80, h: 30 },
      { id: "stop", label: "Stop", x: 100, y: 25, w: 60, h: 40 },
    ];

    render(
      <InteractiveFlowchart
        nodes={routedNodes}
        edges={[
          { from: "qa", to: "stop", label: "failed", route: "curve" },
          { from: "blocker", to: "stop", label: "default" },
        ]}
        details={details}
      />,
    );

    const renderedEdges = within(screen.getByRole("img")).getAllByRole(
      "presentation",
    );
    expect(renderedEdges).toHaveLength(2);
    const [curve, straightEdge] = renderedEdges;
    expect(curve).toHaveAttribute("marker-end", "url(#flow-arrow-solid)");
    const pathData = curve.getAttribute("d") ?? "";
    expect(pathData.match(/[A-Za-z]/g)).toEqual(["M", "C"]);
    const coordinates = pathData.match(/-?(?:\d+\.?\d*|\.\d+)/g)?.map(Number);
    expect(coordinates).toHaveLength(8);
    expect(coordinates?.[0]).toBe(90); // QA’s right edge.
    expect(coordinates?.[2]).toBeGreaterThan(90); // Outside blocker.
    expect(coordinates?.[4]).toBeGreaterThan(90); // Outside blocker.
    expect(coordinates?.[6]).toBe(130); // Stop’s right edge.
    expect(straightEdge).toHaveAttribute("x1");
    expect(straightEdge).not.toHaveAttribute("d");
  });

  it("does not show detail panel initially", () => {
    render(<InteractiveFlowchart nodes={nodes} details={details} />);
    expect(screen.queryByText("Detail A")).not.toBeInTheDocument();
  });

  it("shows detail panel when a node is clicked", () => {
    render(<InteractiveFlowchart nodes={nodes} details={details} />);
    fireEvent.click(screen.getByText("Node A"));
    expect(screen.getByText("Detail A")).toBeInTheDocument();
    expect(screen.getByText("Body of A")).toBeInTheDocument();
  });

  it.each(["Enter", " "])("shows detail panel on %p", (key) => {
    render(<InteractiveFlowchart nodes={nodes} details={details} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Node A" }), {
      key,
    });

    expect(screen.getByText("Detail A")).toBeInTheDocument();
  });

  it("closes detail panel when the same node is clicked again", () => {
    render(<InteractiveFlowchart nodes={nodes} details={details} />);
    fireEvent.click(screen.getByText("Node A"));
    expect(screen.getByText("Detail A")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Node A"));
    expect(screen.queryByText("Detail A")).not.toBeInTheDocument();
  });

  it("two instances have independent state", () => {
    render(
      <>
        <InteractiveFlowchart nodes={nodes} details={details} />
        <InteractiveFlowchart nodes={nodes} details={details} />
      </>,
    );
    const allNodeAs = screen.getAllByText("Node A");
    // Click node A in instance 1
    fireEvent.click(allNodeAs[0]);
    // Detail A appears once (only for instance 1)
    const detailAs = screen.getAllByText("Detail A");
    expect(detailAs).toHaveLength(1);
  });
});
