import { INTERVAL, SET_RALLIES } from "@/components/landing/demo-data";
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
  // the provider's one observer watches the probe: the test says when it is on screen
  intersectBox = (isIntersecting) =>
    intersect(observers[0]!, observers[0]!.targets[0]!, isIntersecting);
});
afterEach(() => {
  jest.useRealTimers();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});

const mount = (props: { seed?: number; replayFrom?: number } = {}) =>
  render(
    <RallyProvider {...props}>
      <Probe />
    </RallyProvider>,
  );
const beats = (n: number) => act(() => jest.advanceTimersByTime(n * INTERVAL));

describe("RallyProvider clock", () => {
  it("files one more rally per beat from the seeded set", () => {
    mount({ seed: 5 });
    expect(read()).toBe("5|0|still");

    beats(1);
    expect(read()).toBe("6|0|live");
    beats(2);
    expect(read()).toBe("8|0|live");
  });

  it("holds while its box is off screen and resumes when it returns", () => {
    mount({ seed: 5 });
    intersectBox(false);
    beats(3);
    expect(read()).toBe("5|0|still");

    intersectBox(true);
    beats(1);
    expect(read()).toBe("6|0|live");
  });

  it("holds while the tab is hidden", () => {
    mount({ seed: 5 });
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

  it("rests a beat on the finished set, then replays it from replayFrom", () => {
    mount({ seed: LEN - 1, replayFrom: 12 });
    intersectBox(true);

    beats(1);
    expect(read()).toBe(`${LEN}|0|live`);
    beats(1); // the pause
    expect(read()).toBe(`${LEN}|0|live`);
    beats(1);
    expect(read()).toBe("12|1|live");
  });

  it("shows one fixed snapshot under reduced motion", () => {
    (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    mount({ seed: 5 });
    const snapshot = read();
    beats(5);

    expect(read()).toBe(snapshot);
    expect(snapshot).toBe("22|-1|still");
  });
});
