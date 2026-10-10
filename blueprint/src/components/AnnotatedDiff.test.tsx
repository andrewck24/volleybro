import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";

jest.mock("fumadocs-ui/components/codeblock", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    CodeBlock: ({ children }: { children: ReactNode }) =>
      createElement("figure", null, children),
    Pre: ({ children }: { children: ReactNode }) =>
      createElement("pre", null, children),
  };
});

import { AnnotatedDiff } from "./AnnotatedDiff";

describe("AnnotatedDiff", () => {
  it("renders unified additions and removals without the marker column", () => {
    const code = `   <DialogFooter>\n-    <Button onClick={submit}>\n+    <Button type="submit">`;
    render(<AnnotatedDiff unified code={code} lang="tsx" />);

    expect(screen.getByText("Removed line:")).toBeInTheDocument();
    expect(screen.getByText("Added line:")).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveTextContent(
      "<Button onClick={submit}>",
    );
    expect(screen.getByRole("figure")).toHaveTextContent(
      '<Button type="submit">',
    );
    expect(screen.getByRole("figure")).not.toHaveTextContent("-    <Button");
  });

  it("reads a unified diff without the prop", () => {
    render(<AnnotatedDiff code={"-const a = 1;\n+const a = 2;"} />);

    expect(screen.getByText("Removed line:")).toBeInTheDocument();
    expect(screen.getByText("Added line:")).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveTextContent("const a = 1;");
    expect(screen.getByRole("figure")).toHaveTextContent("const a = 2;");
  });

  it("strips Shiki notation while preserving ordinary unmarked code", () => {
    render(<AnnotatedDiff code={"const a = 1;\nconst b = 2; // [!code ++]"} />);

    expect(screen.getByText("Added line:")).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveTextContent("const a = 1;");
    expect(screen.getByRole("figure")).toHaveTextContent("const b = 2;");
    expect(screen.getByRole("figure")).not.toHaveTextContent("[!code ++]");
  });

  it("leaves a negative numeric literal in unmarked code alone", () => {
    const code = "const a = 1;\n-1";
    render(<AnnotatedDiff code={code} />);

    expect(screen.getByRole("figure")).toHaveTextContent(code, {
      normalizeWhitespace: false,
    });
    expect(screen.queryByText("Removed line:")).not.toBeInTheDocument();
  });

  it("renders pre-highlighted static markup with its accessible diff labels", () => {
    const highlightedHtml =
      '<figure><pre><code><span class="line"><span class="sr-only">Added line: </span><span>const result = 42;</span></span></code></pre></figure>';
    render(
      <AnnotatedDiff
        code="const result = 42;"
        lang="ts"
        highlightedHtml={highlightedHtml}
      />,
    );

    expect(screen.getByText("Added line:")).toBeInTheDocument();
    expect(screen.getByText("const result = 42;")).toBeInTheDocument();
  });
});
