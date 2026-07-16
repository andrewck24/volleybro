import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Timeline } from "./Timeline";

describe("Timeline", () => {
  const events = [
    {
      date: "2024-01-01",
      label: "Alpha Release",
      description: "First alpha version",
    },
    {
      date: "2024-06-15",
      label: "Beta Launch",
      description: "Public beta launched",
    },
  ];

  it("renders all event fields", () => {
    render(<Timeline events={events} />);
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("Alpha Release")).toBeInTheDocument();
    expect(screen.getByText("First alpha version")).toBeInTheDocument();
    expect(screen.getByText("2024-06-15")).toBeInTheDocument();
    expect(screen.getByText("Beta Launch")).toBeInTheDocument();
    expect(screen.getByText("Public beta launched")).toBeInTheDocument();
  });
});
