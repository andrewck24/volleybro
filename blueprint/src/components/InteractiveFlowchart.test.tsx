import { render, screen, fireEvent } from "@testing-library/react";
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
