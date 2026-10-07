import { SENT_RALLY } from "@/components/landing/demo-data";
import { RecordDemo } from "@/components/landing/record-demo";
import { scoringMoves } from "@/lib/scoring-moves";
import { mockIntersectionObserver } from "@test/support/dom/intersection-observer";
import { render, screen, waitFor } from "@testing-library/react";

// The walkthrough steps when a switch sentinel crosses the viewport centre
// (IntersectionObserver); the test plays the browser and reports the crossing.
let observers: ReturnType<typeof mockIntersectionObserver>["observers"];
let intersect: ReturnType<typeof mockIntersectionObserver>["intersect"];
const setFingerDotSupport = (isSupported: boolean) => {
  (globalThis as unknown as { CSS: unknown }).CSS = {
    supports: () => isSupported,
  };
};
beforeEach(() => {
  ({ observers, intersect } = mockIntersectionObserver());
  // a browser without scroll-driven animation: no finger dot to measure
  setFingerDotSupport(false);
});
afterEach(() => {
  delete (Element.prototype as Partial<Element>).getAnimations;
});

/** What the viewer sees of the app frame: the mirror panels are hidden measuring copies. */
const sees = (text: string) =>
  screen.queryAllByText(text, { ignore: "[data-mirror] *" }).length > 0;
const waitToSee = (text: string) =>
  waitFor(() => expect(sees(text)).toBe(true));

const mount = async () => {
  render(<RecordDemo intro={<h2>intro</h2>} />);
  await waitToSee("選擇球員或對方失誤");
};

const scrollTo = (step: number) => {
  const observer = observers.find((o) => o.targets.length === 4)!;
  intersect(observer, observer.targets[step]!, true);
};

describe("walkthrough demo", () => {
  it("shows the result of tap N at step N", async () => {
    await mount();
    const away = scoringMoves[SENT_RALLY.away]!.text;

    scrollTo(1);
    await waitToSee("我方得失分紀錄"); // player tapped: our moves

    scrollTo(2);
    await waitToSee("對方得失分紀錄"); // our move tapped: their reply
    expect(sees(away)).toBe(false);

    scrollTo(3);
    await waitToSee(away); // reply tapped: the rally is previewed
  });

  it("reverts each state when scrolling back", async () => {
    await mount();
    scrollTo(3);
    await waitToSee(scoringMoves[SENT_RALLY.away]!.text);

    scrollTo(1);
    await waitToSee("我方得失分紀錄");
    expect(sees("對方得失分紀錄")).toBe(false);

    scrollTo(0);
    await waitToSee("選擇球員或對方失誤");
    expect(sees("我方得失分紀錄")).toBe(false);
  });

  it("rests on the unrecorded rally after a reload, whatever the mirrors hold", async () => {
    // the finger dot's hidden mirror panels exist only where it is supported
    setFingerDotSupport(true);
    Element.prototype.getAnimations = () => [];
    await mount();

    // the hidden mirrors already hold taps 1 and 2 ...
    await waitFor(() =>
      expect(screen.getAllByText("對方得失分紀錄").length).toBeGreaterThan(0),
    );
    // ... but the visible frame has not moved: nothing autoplays
    expect(sees("選擇球員或對方失誤")).toBe(true);
    expect(sees("我方得失分紀錄")).toBe(false);
    expect(sees("對方得失分紀錄")).toBe(false);
  });
});
