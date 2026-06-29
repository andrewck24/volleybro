import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AnnotatedDiff } from "./AnnotatedDiff";

describe("AnnotatedDiff", () => {
  const diff = `- old line\n+ new line\n  context line`;
  const annotations = [{ line: 2, note: "This line was added" }];

  it("renders diff lines", () => {
    render(<AnnotatedDiff diff={diff} annotations={annotations} />);
    expect(screen.getByText(/\+ new line/)).toBeInTheDocument();
  });

  it("renders annotation note adjacent to specified line", () => {
    render(<AnnotatedDiff diff={diff} annotations={annotations} />);
    expect(screen.getByText("This line was added")).toBeInTheDocument();
  });

  it("renders annotation note for a 3-line diff at line 2", () => {
    const diff3 = `line one\nline two\nline three`;
    render(
      <AnnotatedDiff
        diff={diff3}
        annotations={[{ line: 2, note: "Note on line 2" }]}
      />
    );
    expect(screen.getByText("Note on line 2")).toBeInTheDocument();
    expect(screen.getByText(/line two/)).toBeInTheDocument();
  });
});
