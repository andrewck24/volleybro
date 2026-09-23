import { StatusBarColor } from "@/components/layout/status-bar-color";
import { act, render } from "@testing-library/react";

const metas: HTMLMetaElement[] = [];

// theme-color lives in <head>, which Testing Library's screen does not query.
const headThemeColors = () => {
  // eslint-disable-next-line testing-library/no-node-access
  const all = document.head.querySelectorAll('meta[name="theme-color"]');
  return Array.from(all, (meta) => [
    meta.getAttribute("media") ?? "",
    meta.getAttribute("content"),
  ]);
};

const addThemeColor = (content: string, media: string) => {
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = content;
  meta.setAttribute("media", media);
  document.head.appendChild(meta);
  metas.push(meta);
};

describe("StatusBarColor", () => {
  beforeEach(() => {
    addThemeColor("rgb(1, 1, 1)", "(prefers-color-scheme: light)");
    addThemeColor("rgb(2, 2, 2)", "(prefers-color-scheme: dark)");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    metas.splice(0).forEach((meta) => meta.remove());
    document.documentElement.className = "";
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
  });

  it("applies, updates, and restores the document background colors", () => {
    document.documentElement.style.backgroundColor = "var(--old-html)";
    document.body.style.backgroundColor = "var(--old-body)";

    const { rerender, unmount } = render(
      <StatusBarColor color="var(--backdrop)" />,
    );

    expect(document.documentElement).toHaveStyle(
      "background-color: var(--backdrop)",
    );
    expect(document.body).toHaveStyle("background-color: var(--backdrop)");

    rerender(<StatusBarColor color="var(--updated-backdrop)" />);

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

  it("puts its own theme-color first in <head>, leaving the framework's metas alone", () => {
    const { rerender, unmount } = render(
      <StatusBarColor color="rgb(10, 20, 30)" />,
    );

    expect(headThemeColors()).toEqual([
      ["", "rgb(10, 20, 30)"],
      ["(prefers-color-scheme: light)", "rgb(1, 1, 1)"],
      ["(prefers-color-scheme: dark)", "rgb(2, 2, 2)"],
    ]);

    rerender(<StatusBarColor color="rgb(40, 50, 60)" />);

    expect(headThemeColors()[0]).toEqual(["", "rgb(40, 50, 60)"]);

    unmount();

    expect(headThemeColors()).toEqual([
      ["(prefers-color-scheme: light)", "rgb(1, 1, 1)"],
      ["(prefers-color-scheme: dark)", "rgb(2, 2, 2)"],
    ]);
  });

  it("rewrites the theme-color when the theme class on <html> changes", async () => {
    const computedStyleSpy = jest.spyOn(window, "getComputedStyle");
    render(<StatusBarColor color="var(--color-card)" />);

    computedStyleSpy.mockReturnValue({
      backgroundColor: "rgb(29, 35, 45)",
    } as CSSStyleDeclaration);
    await act(async () => {
      document.documentElement.classList.add("dark");
    });

    expect(headThemeColors()[0]).toEqual(["", "rgb(29, 35, 45)"]);
  });
});
