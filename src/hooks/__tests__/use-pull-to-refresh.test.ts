import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { act, renderHook } from "@testing-library/react";

jest.mock("@/lib/pwa", () => ({
  isStandalone: jest.fn(),
}));

import { isStandalone } from "@/lib/pwa";
const mockIsStandalone = isStandalone as jest.Mock;

function makeTouchEvent(type: string, clientY: number): TouchEvent {
  return new TouchEvent(type, {
    touches: [{ clientY } as Touch],
    changedTouches: [{ clientY } as Touch],
    bubbles: true,
    cancelable: true,
  });
}

describe("usePullToRefresh", () => {
  let el: HTMLDivElement;
  let ref: { current: HTMLDivElement | null };

  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
    ref = { current: el };
    mockIsStandalone.mockReturnValue(true);
  });

  afterEach(() => {
    document.body.removeChild(el);
    jest.clearAllMocks();
  });

  describe("PWA gating", () => {
    it("returns zero-state and registers no listeners in non-standalone mode", () => {
      mockIsStandalone.mockReturnValue(false);
      const addEventListenerSpy = jest.spyOn(el, "addEventListener");

      const { result } = renderHook(() => usePullToRefresh(ref, jest.fn()));

      expect(result.current).toEqual({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        progress: 0,
      });
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it("registers touchstart listener in standalone mode", () => {
      const addEventListenerSpy = jest.spyOn(el, "addEventListener");

      renderHook(() => usePullToRefresh(ref, jest.fn()));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        { passive: true },
      );
    });
  });

  describe("DOM mutation", () => {
    it("does not write transform to the ref element on touchmove", () => {
      renderHook(() => usePullToRefresh(ref, jest.fn()));

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 100));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 200));
      });

      expect(el).not.toHaveStyle("transform: translateY(0)");
    });

    it("does not write transition to the ref element on touchend", () => {
      renderHook(() => usePullToRefresh(ref, jest.fn()));

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 100));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 200));
      });
      act(() => {
        el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
      });

      expect(el).not.toHaveStyle("transition: transform 0.2s ease-out");
    });

    it("does not write any inline style to the consumer content container", () => {
      renderHook(() => usePullToRefresh(ref, jest.fn()));

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 100));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 250));
      });
      act(() => {
        el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
      });

      // No inline styles should be set on the consumer element
      expect(el).not.toHaveAttribute("style");
    });
  });

  describe("state updates", () => {
    it("updates pullDistance and progress on touchmove", () => {
      const { result } = renderHook(() =>
        usePullToRefresh(ref, jest.fn(), {
          threshold: 80,
          maxPull: 128,
          resistance: 0.4,
        }),
      );

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 0));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 100));
      });

      expect(result.current.isPulling).toBe(true);
      expect(result.current.pullDistance).toBeGreaterThan(0);
      expect(result.current.pullDistance).toBeLessThan(128);
      expect(result.current.progress).toBeGreaterThan(0);
      expect(result.current.progress).toBeLessThanOrEqual(1);
    });

    it("ignores upward pull (negative dy)", () => {
      const { result } = renderHook(() => usePullToRefresh(ref, jest.fn()));

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 100));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 50));
      });

      expect(result.current.pullDistance).toBe(0);
      expect(result.current.isPulling).toBe(false);
    });

    it("resets state on touchend below threshold", () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        usePullToRefresh(ref, onRefresh, { threshold: 80 }),
      );

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 0));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 10));
      });
      act(() => {
        el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
      });

      expect(result.current.isPulling).toBe(false);
      expect(result.current.pullDistance).toBe(0);
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("clamps progress to 1 when pullDistance exceeds threshold", () => {
      const { result } = renderHook(() =>
        usePullToRefresh(ref, jest.fn(), {
          threshold: 80,
          maxPull: 128,
          resistance: 0.4,
        }),
      );

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 0));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 500));
      });

      expect(result.current.progress).toBe(1);
    });

    it("never writes style properties to the ref element (touchcancel path)", () => {
      renderHook(() => usePullToRefresh(ref, jest.fn()));

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 0));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 200));
      });

      // Regardless of cancel/end path, the element must never receive any inline styles
      expect(el).not.toHaveStyle("transform: translateY(0)");
      expect(el).not.toHaveStyle("transition: transform 0.2s ease-out");
      expect(el).not.toHaveAttribute("style");
    });
  });

  describe("minRefreshDisplay", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("keeps isRefreshing true for minRefreshDisplay when onRefresh resolves faster", async () => {
      const onRefresh = jest.fn().mockImplementation(
        () => new Promise<void>((resolve) => setTimeout(resolve, 50)),
      );

      const { result } = renderHook(() =>
        usePullToRefresh(ref, onRefresh, {
          threshold: 80,
          minRefreshDisplay: 300,
        }),
      );

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 0));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 315));
      });
      act(() => {
        el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
      });

      expect(result.current.isRefreshing).toBe(true);

      // onRefresh resolves at 50ms but minRefreshDisplay = 300
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      expect(result.current.isRefreshing).toBe(true);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(150);
      });
      expect(result.current.isRefreshing).toBe(true);

      // Past 300ms total — both settled
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isRefreshing).toBe(false);
    });

    it("waits for onRefresh when it takes longer than minRefreshDisplay", async () => {
      const onRefresh = jest.fn().mockImplementation(
        () => new Promise<void>((resolve) => setTimeout(resolve, 500)),
      );

      const { result } = renderHook(() =>
        usePullToRefresh(ref, onRefresh, {
          threshold: 80,
          minRefreshDisplay: 300,
        }),
      );

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 0));
      });
      act(() => {
        el.dispatchEvent(makeTouchEvent("touchmove", 315));
      });
      act(() => {
        el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
      });

      expect(result.current.isRefreshing).toBe(true);

      // minRefreshDisplay elapsed but onRefresh still running
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });
      expect(result.current.isRefreshing).toBe(true);

      // onRefresh resolves at 500ms — no extra delay
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe("lazy listener attach", () => {
    it("attaches only touchstart at mount", () => {
      const spy = jest.spyOn(el, "addEventListener");
      renderHook(() => usePullToRefresh(ref, jest.fn()));

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("touchstart", expect.any(Function), {
        passive: true,
      });
    });

    it("removes move/end/cancel listeners after touchend", () => {
      const removeSpy = jest.spyOn(el, "removeEventListener");
      renderHook(() => usePullToRefresh(ref, jest.fn()));

      act(() => {
        el.dispatchEvent(makeTouchEvent("touchstart", 0));
      });
      act(() => {
        el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
      });

      expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("touchend", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith(
        "touchcancel",
        expect.any(Function),
      );
    });
  });
});
