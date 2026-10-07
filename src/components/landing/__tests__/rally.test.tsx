import { SET_RALLIES } from "@/components/landing/demo-data";
import { RallyProvider, diffsOf, useRally } from "@/components/landing/rally";
import { act, render, screen } from "@testing-library/react";

const BEAT = 2200;
const LEN = SET_RALLIES.length;

const Probe = () => {
  const { set, setNo, live } = useRally();
  return (
    <p data-testid="probe">{`${set.rallies}|${setNo}|${live ? "live" : "still"}`}</p>
  );
};
const read = () => screen.getByTestId("probe").textContent;

// A controllable IntersectionObserver: the test says when the clock's box is on screen.
let report: (visible: boolean) => void;
beforeEach(() => {
  jest.useFakeTimers();
  global.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    let target: Element;
    report = (isIntersecting) => act(() => cb([{ target, isIntersecting }]));
    return {
      observe: (t: Element) => (target = t),
      disconnect: jest.fn(),
    };
  }) as never;
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
const beats = (n: number) => act(() => jest.advanceTimersByTime(n * BEAT));

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
    report(false);
    beats(3);
    expect(read()).toBe("5|0|still");

    report(true);
    beats(1);
    expect(read()).toBe("6|0|live");
  });

  it("holds while the tab is hidden", () => {
    mount({ seed: 5 });
    report(true);
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
    report(true);

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

describe("diffsOf", () => {
  it("runs the point differential from 0, oldest rally first", () => {
    // entries are newest first: won, won, lost, won -> played won, lost, won, won
    expect(diffsOf({ rallies: 4, entries: [true, true, false, true] })).toEqual(
      [0, 1, 0, 1, 2],
    );
  });
});
