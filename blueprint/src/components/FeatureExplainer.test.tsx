import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FeatureExplainer } from "./FeatureExplainer";

describe("FeatureExplainer", () => {
  const props = {
    title: "Feature Title",
    summary: "This is the summary",
    steps: [
      { label: "Step One", detail: "Detail for step one" },
      { label: "Step Two", detail: "Detail for step two" },
    ],
  };

  it("renders title and summary", () => {
    render(<FeatureExplainer {...props} />);
    expect(screen.getByText("Feature Title")).toBeInTheDocument();
    expect(screen.getByText("This is the summary")).toBeInTheDocument();
  });

  it("renders step labels", () => {
    render(<FeatureExplainer {...props} />);
    expect(screen.getByText("Step One")).toBeInTheDocument();
    expect(screen.getByText("Step Two")).toBeInTheDocument();
  });

  it("step details are hidden by default", () => {
    render(<FeatureExplainer {...props} />);
    expect(screen.queryByText("Detail for step one")).not.toBeInTheDocument();
    expect(screen.queryByText("Detail for step two")).not.toBeInTheDocument();
  });

  it("clicking a step label reveals its detail", () => {
    render(<FeatureExplainer {...props} />);
    fireEvent.click(screen.getByText("Step One"));
    expect(screen.getByText("Detail for step one")).toBeInTheDocument();
    expect(screen.queryByText("Detail for step two")).not.toBeInTheDocument();
  });
});
