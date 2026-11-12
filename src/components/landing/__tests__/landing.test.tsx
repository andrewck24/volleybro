import { Landing } from "@/components/landing";
import { LazyRecordDemo } from "@/components/landing/lazy-demo";
import { RALLY_BEAT_MS } from "@/components/landing/demo-data";
import styles from "@/components/landing/steps.module.css";
import { render, screen, within } from "@testing-library/react";
import { act } from "@testing-library/react";
import { axe } from "jest-axe";
import { mockIntersectionObserver } from "@test/support/dom/intersection-observer";
import { WINDOWS, setUserAgent } from "@test/support/dom/user-agent";

const mockRecordDemoRender = jest.fn();
jest.mock("@/components/landing/record-demo", () => {
  const css = jest.requireActual("@/components/landing/steps.module.css");
  const classes = css.default ?? css;
  return {
    RecordDemo: ({ intro }: { intro: React.ReactNode }) => {
      mockRecordDemoRender();
      return (
        <div data-testid="demo-loaded" className={classes.section}>
          <div data-testid="lazy-demo-stage" className={classes.stage}>
            <div className={classes.introColumn}>{intro}</div>
          </div>
        </div>
      );
    },
  };
});

jest.mock("@/components/landing/live-stats", () => ({
  LiveStats: () => (
    <div data-testid="live-stats-slide">
      <h3>總分</h3>
    </div>
  ),
}));
jest.mock("@/components/landing/entry-rows", () => ({
  EntryRows: () => (
    <div data-testid="entries-slide" className="landing-entry-rows">
      <div className="landing-entry-row">
        <span data-score-badge />
      </div>
    </div>
  ),
}));
jest.mock("@/components/landing/diff-chart", () => ({
  DiffChart: () => <div data-testid="diff-chart-slide" />,
}));

beforeEach(() => {
  setUserAgent(WINDOWS);
  mockRecordDemoRender.mockClear();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("Landing", () => {
  it("lays out one h1 and each section's h2, and every start button leads into the app", async () => {
    const { container } = render(<Landing />);
    await screen.findByText("總分");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
    const starts = screen.getAllByRole("link", { name: "開始記錄" });
    expect(starts.length).toBeGreaterThan(1);
    for (const link of starts) expect(link).toHaveAttribute("href", "/home");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("does not re-render the walkthrough on every rally beat", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    const { observers, intersect } = mockIntersectionObserver();
    try {
      render(<Landing />);
      const placeholderObserver = observers.find((observer) =>
        observer.targets.some((target) => target.className === styles.section),
      )!;
      intersect(
        placeholderObserver,
        placeholderObserver.targets.find(
          (target) => target.className === styles.section,
        )!,
        true,
      );
      await screen.findByTestId("demo-loaded");
      expect(mockRecordDemoRender).toHaveBeenCalledTimes(1);

      const clockObserver = observers.find((observer) =>
        observer.targets.some((target) => target.hasAttribute("data-rally")),
      )!;
      intersect(
        clockObserver,
        clockObserver.targets.find((target) =>
          target.hasAttribute("data-rally"),
        )!,
        true,
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(RALLY_BEAT_MS);
      });

      expect(mockRecordDemoRender).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps the lazy placeholder height stable while loading", async () => {
    const { observers, intersect } = mockIntersectionObserver();
    render(<LazyRecordDemo intro={<h2>Walkthrough intro</h2>} />);
    const placeholder = screen.getByTestId("lazy-demo-placeholder");
    const placeholderStage = screen.getByTestId("lazy-demo-stage");

    expect(placeholder).toHaveClass(styles.section!);
    intersect(observers[0]!, observers[0]!.targets[0]!, true);

    const loaded = await screen.findByTestId("demo-loaded");
    expect(loaded).toHaveClass(styles.section!);
    expect(placeholder).toHaveClass(styles.section!);
    expect(within(loaded).getByTestId("lazy-demo-stage")).toHaveClass(
      styles.stage!,
    );
    expect(placeholderStage).toHaveClass(styles.stage!);
  });

  it("mounts only active and adjacent statistics slides", async () => {
    render(<Landing />);
    await screen.findByText("總分");

    const first = screen.getByRole("group", {
      name: "1 / 3：技術類別統計",
    });
    const second = screen.getByRole("group", {
      name: "2 / 3：逐球記錄",
    });
    const third = screen.getByRole("group", {
      name: "3 / 3：分差折線圖",
    });

    expect(within(first).getByTestId("live-stats-slide")).toBeInTheDocument();
    expect(within(second).getByTestId("entries-slide")).toBeInTheDocument();
    expect(
      within(third).queryByTestId("diff-chart-slide"),
    ).not.toBeInTheDocument();
  });
});
