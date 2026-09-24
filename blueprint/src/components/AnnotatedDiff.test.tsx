import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AnnotatedDiff } from "./AnnotatedDiff";

// DynamicCodeBlock lazy-loads a Shiki highlighter (async, WASM) which jsdom
// can't drive; stub it with a plain <pre> so the code stays assertable.
jest.mock("fumadocs-ui/components/dynamic-codeblock", () => ({
  DynamicCodeBlock: ({ code }: { code: string }) => (
    <pre data-testid="code">{code}</pre>
  ),
}));

// @shikijs/transformers ships ESM-only; jest doesn't transform node_modules and
// the transformer never runs under the mocked code block anyway, so stub it.
jest.mock("@shikijs/transformers", () => ({
  transformerNotationDiff: () => ({}),
}));

describe("AnnotatedDiff", () => {
  it("strips the unified marker column so the body highlights as its own language", () => {
    const code = `   <DialogFooter>\n-    <Button onClick={submit}>\n+    <Button type="submit">`;
    render(<AnnotatedDiff unified code={code} />);
    const lines = screen.getByTestId("code").textContent?.split("\n") ?? [];

    // The marker is replaced by a space; fumadocs' ::before puts it back in the
    // gutter, so a literal "+" or "-" in the body would render it twice.
    expect(lines).toEqual([
      "   <DialogFooter>",
      "     <Button onClick={submit}>",
      '     <Button type="submit">',
    ]);
  });

  it("reads a unified diff without the prop", () => {
    render(<AnnotatedDiff code={"-const a = 1;\n+const a = 2;"} />);
    expect(screen.getByTestId("code")).toHaveTextContent(
      " const a = 1;\n const a = 2;",
      { normalizeWhitespace: false },
    );
  });

  it("leaves unmarked code alone", () => {
    const code = "const a = 1;\n-1";
    render(<AnnotatedDiff code={code} />);
    expect(screen.getByTestId("code")).toHaveTextContent(code, {
      normalizeWhitespace: false,
    });
  });

  it("passes the diff-notated code through to the highlighter", () => {
    const code = `const a = 1;\nconst b = 2; // [!code ++]`;
    render(<AnnotatedDiff code={code} />);
    expect(screen.getByText(/\[!code \+\+\]/)).toBeInTheDocument();
    expect(screen.getByText(/const a = 1;/)).toBeInTheDocument();
  });
});
