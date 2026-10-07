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

describe("InteractiveFlowchart", () => {
  it("renders all node labels", () => {
    render(<InteractiveFlowchart nodes={nodes} details={details} />);
    expect(screen.getByText("Node A")).toBeInTheDocument();
    expect(screen.getByText("Node B")).toBeInTheDocument();
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
