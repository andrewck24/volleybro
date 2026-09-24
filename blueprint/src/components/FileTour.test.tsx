import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FileTour } from "./FileTour";

// DynamicCodeBlock lazy-loads a Shiki highlighter (async, WASM) which jsdom
// can't drive; stub it with a plain <pre> so the snippet stays assertable.
jest.mock("fumadocs-ui/components/dynamic-codeblock", () => ({
  DynamicCodeBlock: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

// @shikijs/transformers ships ESM-only; jest doesn't transform node_modules and
// the transformer never runs under the mocked code block anyway, so stub it.
jest.mock("@shikijs/transformers", () => ({
  transformerNotationDiff: () => ({}),
}));

const files = [
  {
    path: "src/a.ts",
    change: "added" as const,
    added: 126,
    summary: "New helper module",
    code: "export const a = 1;",
  },
  {
    path: "src/b.ts",
    change: "modified" as const,
    added: 14,
    removed: 62,
    summary: "Wired the helper in",
  },
  {
    path: "src/c.ts",
    change: "removed" as const,
    removed: 40,
    summary: "Superseded by a.ts",
  },
];

describe("FileTour", () => {
  it("renders each file path and status badge while collapsed", () => {
    render(<FileTour files={files} />);
    expect(screen.getByText("src/a.ts")).toBeInTheDocument();
    expect(screen.getByText("src/b.ts")).toBeInTheDocument();
    expect(screen.getByText("src/c.ts")).toBeInTheDocument();
    expect(screen.getByText("NEW")).toBeInTheDocument();
    expect(screen.getByText("MOD")).toBeInTheDocument();
    expect(screen.getByText("DEL")).toBeInTheDocument();
    expect(screen.getByText("+126")).toBeInTheDocument();
  });

  it("keeps each summary hidden until its trigger is clicked", () => {
    render(<FileTour files={files} />);
    expect(screen.queryByText("New helper module")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /src\/a\.ts/ }));
    expect(screen.getByText("New helper module")).toBeInTheDocument();
    expect(screen.getByText("export const a = 1;")).toBeInTheDocument();

    // Other files stay collapsed.
    expect(screen.queryByText("Wired the helper in")).not.toBeInTheDocument();
  });

  it("omits the badge and diff stat for concept-mode entries", () => {
    render(
      <FileTour
        files={[
          {
            path: "Side-out",
            summary: "Winning a rally while the opposing team is serving.",
          },
        ]}
      />,
    );
    // Header still renders.
    expect(screen.getByText("Side-out")).toBeInTheDocument();
    // No change badge is emitted when `change` is omitted.
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
    expect(screen.queryByText("MOD")).not.toBeInTheDocument();
    expect(screen.queryByText("DEL")).not.toBeInTheDocument();
  });
});
