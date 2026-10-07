import { RallyProvider } from "@/components/landing/rally";
import { StatsCarousel } from "@/components/landing/stats-carousel";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom does no layout: give the track a width and let scrollTo move it and
// report the scroll, as a browser's snap track would.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    value: 300,
  });
  Element.prototype.scrollTo = function (this: Element, opts?: unknown) {
    this.scrollLeft = (opts as ScrollToOptions).left!;
    this.dispatchEvent(new Event("scroll"));
  } as never;
});

const mount = async () => {
  render(
    <RallyProvider>
      <StatsCarousel />
    </RallyProvider>,
  );
  // the first slide loads lazily (next/dynamic)
  await screen.findByText("總分");
};
const dot = (title: string) =>
  screen.getByRole("button", { name: new RegExp(title) });
const heading = () => screen.getByRole("heading", { level: 3 });

describe("StatsCarousel", () => {
  it("opens on the first slide with its description and no dev badge", async () => {
    await mount();

    expect(heading()).toHaveTextContent("技術類別統計");
    expect(dot("技術類別統計")).toHaveAttribute("aria-current", "true");
    expect(screen.queryByText("開發中")).not.toBeInTheDocument();
  });

  it("cycles with the buttons in both directions, wrapping at the ends", async () => {
    const user = userEvent.setup();
    await mount();

    await user.click(screen.getByRole("button", { name: "上一個" }));
    await waitFor(() =>
      expect(dot("分差折線圖")).toHaveAttribute("aria-current", "true"),
    );

    await user.click(screen.getByRole("button", { name: "下一個" }));
    await waitFor(() =>
      expect(dot("技術類別統計")).toHaveAttribute("aria-current", "true"),
    );
  });

  it("follows the arrow keys and the dots, swapping the description", async () => {
    const user = userEvent.setup();
    await mount();

    screen.getByRole("group", { name: /統計功能示範/ }).focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(dot("逐球記錄")).toHaveAttribute("aria-current", "true"),
    );
    await waitFor(() => expect(heading()).toHaveTextContent("逐球記錄"));

    await user.keyboard("{ArrowLeft}");
    await waitFor(() =>
      expect(dot("技術類別統計")).toHaveAttribute("aria-current", "true"),
    );
    await waitFor(() => expect(heading()).toHaveTextContent("技術類別統計"));

    await user.click(dot("分差折線圖"));
    await waitFor(() => expect(heading()).toHaveTextContent("分差折線圖"));
  });

  it("flags only the point-diff chart as in development", async () => {
    const user = userEvent.setup();
    await mount();

    await user.click(dot("分差折線圖"));
    await waitFor(() => expect(heading()).toHaveTextContent("開發中"));

    await user.click(dot("逐球記錄"));
    await waitFor(() => expect(heading()).toHaveTextContent("逐球記錄"));
    expect(heading()).not.toHaveTextContent("開發中");
  });
});
