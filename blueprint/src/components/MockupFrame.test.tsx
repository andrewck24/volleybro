import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup as staticMarkup } from "react-dom/server";

import { MockupFrame } from "./MockupFrame";

function Broken(): never {
  throw new Error("stale component");
}

describe("MockupFrame", () => {
  it("renders the mockup once mounted in the browser", async () => {
    const { container } = render(
      <MockupFrame Mockup={() => <p>mockup body</p>} />,
    );
    expect(await screen.findByText("mockup body")).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- the proof marker is intentionally hidden
    const mountMarker = container.querySelector(
      '[data-blueprint-mockup-mounted="true"]',
    );
    expect(mountMarker).toBeInTheDocument();
  });

  it("keeps the mount marker out of static HTML", () => {
    const staticHtml = staticMarkup(
      <MockupFrame Mockup={() => <p>mockup body</p>} />,
    );

    expect(staticHtml).toContain("載入設計稿…");
    expect(staticHtml).not.toContain("data-blueprint-mockup-mounted");
  });

  it("shows the failure instead of propagating it when the mockup throws", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    render(<MockupFrame Mockup={Broken} />);
    expect(await screen.findByText(/stale component/)).toBeInTheDocument();
    error.mockRestore();
  });
});
