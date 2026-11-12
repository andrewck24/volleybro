import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup as staticMarkup } from "react-dom/server";

import { MockupFrame } from "./mockup-frame";

function Broken(): never {
  throw new Error("stale component");
}

describe("MockupFrame", () => {
  it("renders the mockup once mounted in the browser", async () => {
    render(<MockupFrame Mockup={() => <p>mockup body</p>} />);
    expect(await screen.findByText("mockup body")).toBeInTheDocument();
  });

  it("keeps the mockup out of static HTML", () => {
    const staticHtml = staticMarkup(
      <MockupFrame Mockup={() => <p>mockup body</p>} />,
    );

    expect(staticHtml).toContain("載入設計稿…");
    expect(staticHtml).not.toContain("mockup body");
  });

  it("shows the failure instead of propagating it when the mockup throws", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    render(<MockupFrame Mockup={Broken} />);
    expect(await screen.findByText(/stale component/)).toBeInTheDocument();
    error.mockRestore();
  });
});
