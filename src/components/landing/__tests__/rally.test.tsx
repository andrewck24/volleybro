import { RALLY_BEAT_MS, SET_RALLIES } from "@/components/landing/demo-data";
import { RallyLayer } from "@/components/landing/rally-layer";
import { RallyProvider, useRally } from "@/components/landing/rally";
import { mockIntersectionObserver } from "@test/support/dom/intersection-observer";
import { act, render, screen } from "@testing-library/react";

const LEN = SET_RALLIES.length;

const Probe = () => {
  const { rallies, setNo, isLive } = useRally();
  return (
    <p
      data-rally
      data-testid="probe"
    >{`${rallies}|${setNo}|${isLive ? "live" : "still"}`}</p>
  );
};
const read = () => screen.getByTestId("probe").textContent;

let intersectBox: (isIntersecting: boolean) => void;
beforeEach(() => {
  jest.useFakeTimers();
  const { observers, intersect } = mockIntersectionObserver();
  intersectBox = (isIntersecting) =>
    intersect(observers[0]!, observers[0]!.targets[0]!, isIntersecting);
});
afterEach(() => {
  jest.useRealTimers();
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});

const mount = (
  props: { initialRalliesPlayed?: number; replayFrom?: number } = {},
) =>
  render(
    <RallyProvider {...props}>
      <Probe />
    </RallyProvider>,
  );
const beats = (n: number) =>
  act(() => jest.advanceTimersByTime(n * RALLY_BEAT_MS));

const rect = (left: number, top: number, width: number, height: number) => ({
  x: left,
  y: top,
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
  toJSON: () => ({}),
});

describe("RallyProvider clock", () => {
  it("files one more rally per beat from the seeded set", () => {
    mount({ initialRalliesPlayed: 5 });
    expect(read()).toBe("5|0|still");

    beats(1);
    expect(read()).toBe("6|0|live");
    beats(2);
    expect(read()).toBe("8|0|live");
  });

  it("holds while its box is off screen and resumes when it returns", () => {
    mount({ initialRalliesPlayed: 5 });
    intersectBox(false);
    beats(3);
    expect(read()).toBe("5|0|still");

    intersectBox(true);
    beats(1);
    expect(read()).toBe("6|0|live");
  });

  it("holds while the tab is hidden", () => {
    mount({ initialRalliesPlayed: 5 });
    intersectBox(true);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    beats(3);
    expect(read()).toBe("5|0|still");

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    beats(1);
    expect(read()).toBe("6|0|live");
  });

  it("shows one fixed snapshot under reduced motion", () => {
    (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    mount({ initialRalliesPlayed: 5 });
    const snapshot = read();
    beats(5);
    expect(read()).toBe(snapshot);
    expect(snapshot).toBe("22|-1|still");
  });

  it("rests a beat on the finished set, then replays it from replayFrom", () => {
    mount({ initialRalliesPlayed: LEN - 1, replayFrom: 12 });
    intersectBox(true);

    beats(1);
    expect(read()).toBe(`${LEN}|0|live`);
    beats(1);
    expect(read()).toBe(`${LEN}|0|live`);
    beats(1);
    expect(read()).toBe("12|1|live");
  });

  it("aligns the animated mark with the first score badge", async () => {
    let resize!: ResizeObserverCallback;
    global.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    } as never;
    jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.hasAttribute("data-rally")) return rect(10, 20, 300, 500);
        if (this.classList.contains("landing-entry-rows"))
          return rect(30, 40, 100, 200);
        if (this.classList.contains("landing-entry-row"))
          return rect(35, 45, 50, 20);
        if (this.hasAttribute("data-score-badge")) return rect(40, 50, 20, 10);
        return rect(0, 0, 0, 0);
      });
    render(
      <RallyProvider initialRalliesPlayed={1}>
        <RallyLayer />
      </RallyProvider>,
    );

    await screen.findByTestId("landing-entry-row");
    act(() => resize([], {} as ResizeObserver));

    const layer = screen.getByTestId("rally-layer");
    expect(layer.style.getPropertyValue("--mark-target-x")).toBe("35px");
    expect(layer.style.getPropertyValue("--mark-target-y")).toBe("30px");
  });
});
