import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TLDR } from "./TLDR";

describe("TLDR", () => {
  it("renders the TL;DR eyebrow", () => {
    render(<TLDR>Summary text</TLDR>);
    expect(screen.getByText("TL;DR")).toBeInTheDocument();
  });

  it("renders the children", () => {
    render(<TLDR>Summary text</TLDR>);
    expect(screen.getByText("Summary text")).toBeInTheDocument();
  });
});
