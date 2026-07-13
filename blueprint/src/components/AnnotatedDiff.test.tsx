import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AnnotatedDiff } from "./AnnotatedDiff";

// DynamicCodeBlock lazy-loads a Shiki highlighter (async, WASM) which jsdom
// can't drive; stub it with a plain <pre> so the code stays assertable.
jest.mock("fumadocs-ui/components/dynamic-codeblock", () => ({
  DynamicCodeBlock: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

// @shikijs/transformers ships ESM-only; jest doesn't transform node_modules and
// the transformer never runs under the mocked code block anyway, so stub it.
jest.mock("@shikijs/transformers", () => ({
  transformerNotationDiff: () => ({}),
}));

describe("AnnotatedDiff", () => {
  it("passes the diff-notated code through to the highlighter", () => {
    const code = `const a = 1;\nconst b = 2; // [!code ++]`;
    render(<AnnotatedDiff code={code} />);
    expect(screen.getByText(/\[!code \+\+\]/)).toBeInTheDocument();
    expect(screen.getByText(/const a = 1;/)).toBeInTheDocument();
  });
});
