import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExampleTable } from "./ExampleTable";

describe("ExampleTable", () => {
  const headers = ["Input", "Expected", "Notes"];
  const rows = [
    ["foo", "bar", "first case"],
    ["baz", "qux", "second case"],
    ["abc", "xyz", "third case"],
  ];

  it("renders header count matching headers.length", () => {
    render(<ExampleTable headers={headers} rows={rows} />);
    const ths = screen.getAllByRole("columnheader");
    expect(ths).toHaveLength(headers.length);
  });

  it("renders row count matching rows.length", () => {
    render(<ExampleTable headers={headers} rows={rows} />);
    const trs = screen.getAllByRole("row");
    // subtract 1 for the header row
    expect(trs.length - 1).toBe(rows.length);
  });
});
