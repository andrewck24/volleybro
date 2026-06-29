import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConceptExplainer } from "./ConceptExplainer";

describe("ConceptExplainer", () => {
  it("renders term, definition, and example", () => {
    render(
      <ConceptExplainer
        term="Rally"
        definition="A sequence of play between serve and point."
        example='serve → dig → set → spike → point'
      />
    );
    expect(screen.getByText("Rally")).toBeInTheDocument();
    expect(screen.getByText("A sequence of play between serve and point.")).toBeInTheDocument();
    expect(screen.getByText("serve → dig → set → spike → point")).toBeInTheDocument();
  });
});
