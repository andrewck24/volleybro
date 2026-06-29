import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PRWriteup } from "./PRWriteup";

describe("PRWriteup", () => {
  it("renders open PR correctly", () => {
    render(<PRWriteup number={42} title="Add feature X" status="open" />);
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Add feature X")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders merged PR correctly", () => {
    render(<PRWriteup number={42} title="Add feature X" status="merged" />);
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Add feature X")).toBeInTheDocument();
    expect(screen.getByText("merged")).toBeInTheDocument();
  });

  it("renders closed PR correctly", () => {
    render(<PRWriteup number={42} title="Add feature X" status="closed" />);
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Add feature X")).toBeInTheDocument();
    expect(screen.getByText("closed")).toBeInTheDocument();
  });
});
