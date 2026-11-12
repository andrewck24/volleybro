import { RallyProvider } from "@/components/landing/rally";
import { StatsCarousel } from "@/components/landing/stats-carousel";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  it("mounts only active and adjacent statistics slides", async () => {
    await mount();

    const activeSlide = screen.getByRole("group", {
      name: "1 / 3：技術類別統計",
    });
    const adjacentSlide = screen.getByRole("group", {
      name: "2 / 3：逐球記錄",
    });
    const distantSlide = screen.getByRole("group", {
      name: "3 / 3：分差折線圖",
    });

    expect(within(activeSlide).getByText("總分")).toBeInTheDocument();
    const [adjacentEntry] =
      await within(adjacentSlide).findAllByTestId("landing-entry-row");
    expect(adjacentEntry).toBeInTheDocument();
    expect(distantSlide).toBeEmptyDOMElement();
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

  it("replaces the slide body when the transition completes", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    try {
      render(
        <RallyProvider>
          <StatsCarousel />
        </RallyProvider>,
      );
      await screen.findByText("總分");

      fireEvent.click(screen.getByRole("button", { name: "下一個" }));
      expect(heading()).toHaveTextContent("技術類別統計");
      expect(screen.queryByText("逐球記錄")).not.toBeInTheDocument();
      expect(
        screen.getByText("發球、攻擊、攔網、接發、防守，各自累計得失分。"),
      ).toBeInTheDocument();

      await act(async () => {
        await jest.advanceTimersToNextTimerAsync();
      });
      expect(heading()).toHaveTextContent("逐球記錄");
      expect(
        screen.queryByText("發球、攻擊、攔網、接發、防守，各自累計得失分。"),
      ).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
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
