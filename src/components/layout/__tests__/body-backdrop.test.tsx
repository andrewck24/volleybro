import { BodyBackdrop } from "@/components/layout/body-backdrop";
import { render } from "@testing-library/react";

describe("BodyBackdrop", () => {
  afterEach(() => {
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
  });

  it("applies, updates, and restores the document background colors", () => {
    document.documentElement.style.backgroundColor = "var(--old-html)";
    document.body.style.backgroundColor = "var(--old-body)";

    const { rerender, unmount } = render(
      <BodyBackdrop color="var(--backdrop)" />,
    );

    expect(document.documentElement).toHaveStyle(
      "background-color: var(--backdrop)",
    );
    expect(document.body).toHaveStyle("background-color: var(--backdrop)");

    rerender(<BodyBackdrop color="var(--updated-backdrop)" />);

    expect(document.documentElement).toHaveStyle(
      "background-color: var(--updated-backdrop)",
    );
    expect(document.body).toHaveStyle(
      "background-color: var(--updated-backdrop)",
    );

    unmount();

    expect(document.documentElement).toHaveStyle(
      "background-color: var(--old-html)",
    );
    expect(document.body).toHaveStyle("background-color: var(--old-body)");
  });
});
