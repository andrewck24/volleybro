import { PullRefreshIndicator } from "@/components/layout/pull-refresh-indicator";
import type { PullToRefreshState } from "@/hooks/use-pull-to-refresh";
import { render, screen } from "@testing-library/react";

// jsdom doesn't ship TransitionEvent; provide a minimal polyfill
if (typeof TransitionEvent === "undefined") {
  class TransitionEventPolyfill extends Event {
    propertyName: string;
    constructor(type: string, init?: EventInit & { propertyName?: string }) {
      super(type, init);
      this.propertyName = init?.propertyName ?? "";
    }
  }
  (global as unknown as Record<string, unknown>).TransitionEvent =
    TransitionEventPolyfill;
}

jest.mock("react-icons/md", () => ({
  MdOutlineSportsVolleyball: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="volleyball-icon" {...props} />
  ),
}));

const idleState: PullToRefreshState = {
  isPulling: false,
  isRefreshing: false,
  pullDistance: 0,
  progress: 0,
};

function makeState(overrides: Partial<PullToRefreshState>): PullToRefreshState {
  return { ...idleState, ...overrides };
}

describe("PullRefreshIndicator", () => {
  describe("wrapper height", () => {
    it("has height 0 when idle", () => {
      render(<PullRefreshIndicator state={idleState} />);
      expect(screen.getByTestId("pull-refresh-wrapper")).toHaveStyle({
        height: "0px",
      });
    });

    it("has height equal to pullDistance when isPulling", () => {
      const state = makeState({
        isPulling: true,
        pullDistance: 40,
        progress: 0.5,
      });
      render(<PullRefreshIndicator state={state} />);
      expect(screen.getByTestId("pull-refresh-wrapper")).toHaveStyle({
        height: "40px",
      });
    });

    it("has height equal to pullDistance when isRefreshing", () => {
      const state = makeState({
        isRefreshing: true,
        pullDistance: 80,
        progress: 1,
      });
      render(<PullRefreshIndicator state={state} />);
      expect(screen.getByTestId("pull-refresh-wrapper")).toHaveStyle({
        height: "80px",
      });
    });
  });

  describe("icon animations", () => {
    it("applies spin and bounce classes when isRefreshing", () => {
      const state = makeState({
        isRefreshing: true,
        pullDistance: 80,
        progress: 1,
      });
      render(<PullRefreshIndicator state={state} />);
      const icon = screen.getByTestId("volleyball-icon");
      expect(icon).toHaveClass("animate-spin");
      expect(icon).toHaveClass("animate-volleyball-bounce");
    });

    it("does not apply spin/bounce when only isPulling", () => {
      const state = makeState({
        isPulling: true,
        pullDistance: 40,
        progress: 0.5,
      });
      render(<PullRefreshIndicator state={state} />);
      const icon = screen.getByTestId("volleyball-icon");
      expect(icon).not.toHaveAttribute(
        "class",
        expect.stringContaining("animate-spin"),
      );
    });
  });

  describe("snap-back transition", () => {
    it("adds height transition on wrapper when isPulling transitions to false", () => {
      const pullingState = makeState({
        isPulling: true,
        pullDistance: 60,
        progress: 0.75,
      });
      const { rerender } = render(
        <PullRefreshIndicator state={pullingState} />,
      );
      const wrapper = screen.getByTestId("pull-refresh-wrapper");

      rerender(<PullRefreshIndicator state={idleState} />);

      expect(wrapper).toHaveStyle({ transition: "height 0.2s ease-out" });
    });

    it("does not add height transition during active pulling", () => {
      const state1 = makeState({
        isPulling: true,
        pullDistance: 30,
        progress: 0.375,
      });
      const state2 = makeState({
        isPulling: true,
        pullDistance: 60,
        progress: 0.75,
      });
      const { rerender } = render(<PullRefreshIndicator state={state1} />);
      const wrapper = screen.getByTestId("pull-refresh-wrapper");

      rerender(<PullRefreshIndicator state={state2} />);

      expect(wrapper).not.toHaveStyle({ transition: "height 0.2s ease-out" });
    });

    it("removes transition after transitionend fires for height", () => {
      const pullingState = makeState({
        isPulling: true,
        pullDistance: 60,
        progress: 0.75,
      });
      const { rerender } = render(
        <PullRefreshIndicator state={pullingState} />,
      );
      const wrapper = screen.getByTestId("pull-refresh-wrapper");

      rerender(<PullRefreshIndicator state={idleState} />);
      expect(wrapper).toHaveStyle({ transition: "height 0.2s ease-out" });

      wrapper.dispatchEvent(
        new TransitionEvent("transitionend", {
          propertyName: "height",
          bubbles: true,
        }),
      );

      expect(wrapper).toHaveStyle({ transition: "" });
    });

    it("does not remove transition for non-height transitionend", () => {
      const pullingState = makeState({
        isPulling: true,
        pullDistance: 60,
        progress: 0.75,
      });
      const { rerender } = render(
        <PullRefreshIndicator state={pullingState} />,
      );
      const wrapper = screen.getByTestId("pull-refresh-wrapper");

      rerender(<PullRefreshIndicator state={idleState} />);

      wrapper.dispatchEvent(
        new TransitionEvent("transitionend", {
          propertyName: "opacity",
          bubbles: true,
        }),
      );

      expect(wrapper).toHaveStyle({ transition: "height 0.2s ease-out" });
    });
  });

  describe("layout", () => {
    it("is not absolutely positioned", () => {
      render(<PullRefreshIndicator state={idleState} />);
      const wrapper = screen.getByTestId("pull-refresh-wrapper");
      expect(wrapper).not.toHaveStyle({ position: "absolute" });
      expect(wrapper).not.toHaveAttribute(
        "class",
        expect.stringContaining("absolute"),
      );
    });
  });
});
