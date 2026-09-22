import { render, screen } from "@testing-library/react";

import { MockupFrame } from "./MockupFrame";

function Broken(): never {
  throw new Error("stale component");
}

describe("MockupFrame", () => {
  it("renders the mockup once mounted in the browser", async () => {
    render(<MockupFrame Mockup={() => <p>mockup body</p>} />);
    expect(await screen.findByText("mockup body")).toBeInTheDocument();
  });

  it("shows the failure instead of propagating it when the mockup throws", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    render(<MockupFrame Mockup={Broken} />);
    expect(await screen.findByText(/stale component/)).toBeInTheDocument();
    error.mockRestore();
  });
});
