import { SENT_RALLY } from "@/components/landing/demo-data";
import { RecordDemo } from "@/components/landing/record-demo";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, render, screen } from "@testing-library/react";

// The walkthrough steps when a switch sentinel crosses the viewport centre
// (IntersectionObserver); the test plays the browser and reports the crossing.
type Observer = { cb: IntersectionObserverCallback; targets: Element[] };
let observers: Observer[] = [];
beforeEach(() => {
  observers = [];
  // a browser without scroll-driven animation: no finger dot to measure
  (globalThis as unknown as { CSS: unknown }).CSS = { supports: () => false };
  global.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    const o: Observer = { cb, targets: [] };
    observers.push(o);
    return {
      observe: (t: Element) => o.targets.push(t),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    };
  }) as never;
});

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 200));
  });

const mount = async () => {
  render(<RecordDemo intro={<h2>intro</h2>} />);
  await settle();
};

/** What the viewer sees of the app frame: the mirror panels are hidden measuring copies. */
const sees = (text: string) =>
  screen.queryAllByText(text, { ignore: "[data-mirror] *" }).length > 0;

const scrollTo = async (step: number) => {
  const { cb, targets } = observers.find((o) => o.targets.length === 4)!;
  await act(async () => {
    cb([{ target: targets[step], isIntersecting: true } as never], {} as never);
  });
  await settle();
};

describe("walkthrough demo", () => {
  it("shows the result of tap N at step N", async () => {
    await mount();
    const away = scoringMoves[SENT_RALLY.away]!.text;
    expect(sees("選擇球員或對方失誤")).toBe(true); // nobody picked yet

    await scrollTo(1);
    expect(sees("我方得失分紀錄")).toBe(true); // player tapped: our moves

    await scrollTo(2);
    expect(sees("對方得失分紀錄")).toBe(true); // our move tapped: their reply
    expect(sees(away)).toBe(false);

    await scrollTo(3);
    expect(sees(away)).toBe(true); // reply tapped: the rally is previewed
  });

  it("reverts each state when scrolling back", async () => {
    await mount();
    await scrollTo(3);

    await scrollTo(1);
    expect(sees("我方得失分紀錄")).toBe(true);
    expect(sees("對方得失分紀錄")).toBe(false);

    await scrollTo(0);
    expect(sees("選擇球員或對方失誤")).toBe(true);
    expect(sees("我方得失分紀錄")).toBe(false);
  });

  it("rests on the unrecorded rally after a reload, whatever the mirrors hold", async () => {
    await mount();

    // the hidden mirrors already hold taps 1 and 2 ...
    expect(screen.getAllByText("對方得失分紀錄").length).toBeGreaterThan(0);
    // ... but the visible frame has not moved: nothing autoplays
    expect(sees("選擇球員或對方失誤")).toBe(true);
    expect(sees("我方得失分紀錄")).toBe(false);
    expect(sees("對方得失分紀錄")).toBe(false);
  });
});
