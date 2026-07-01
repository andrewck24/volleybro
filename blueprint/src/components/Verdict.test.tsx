import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Verdict } from "./Verdict";

describe("Verdict", () => {
  it("shows Pass label for status=pass", () => {
    render(<Verdict status="pass" />);
    expect(screen.getByText(/pass/i)).toBeInTheDocument();
  });

  it("shows Fail label for status=fail", () => {
    render(<Verdict status="fail" />);
    expect(screen.getByText(/fail/i)).toBeInTheDocument();
  });

  it("shows Partial label for status=partial", () => {
    render(<Verdict status="partial" />);
    expect(screen.getByText(/partial/i)).toBeInTheDocument();
  });
});
