import { SENT_RALLY } from "@/components/landing/demo-data";
import { DEMO_GAME_ID } from "@/components/landing/demo-data";
import { demoGame } from "@/components/landing/demo-game";
import { RecordDemo } from "@/components/landing/record-demo";
import { StepsSection } from "@/components/landing/steps-section";
import { scoringMoves } from "@/lib/scoring-moves";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { mockIntersectionObserver } from "@test/support/dom/intersection-observer";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";

let observers: ReturnType<typeof mockIntersectionObserver>["observers"];
let intersect: ReturnType<typeof mockIntersectionObserver>["intersect"];
const setFingerDotSupport = (isSupported: boolean) => {
  (globalThis as unknown as { CSS: unknown }).CSS = {
    supports: () => isSupported,
  };
};
beforeEach(() => {
  ({ observers, intersect } = mockIntersectionObserver());
  setFingerDotSupport(false);
});
afterEach(() => {
  delete (Element.prototype as Partial<Element>).getAnimations;
});

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
    const away = scoringMoves[SENT_RALLY.awayMoveIndex]!.text;

    scrollTo(1);
    await waitToSee("我方得失分紀錄");

    scrollTo(2);
    await waitToSee("對方得失分紀錄");
    expect(sees(away)).toBe(false);

    scrollTo(3);
    await waitToSee(away);
  });

  it("reverts each state when scrolling back", async () => {
    await mount();
    scrollTo(3);
    await waitToSee(scoringMoves[SENT_RALLY.awayMoveIndex]!.text);

    scrollTo(1);
    await waitToSee("我方得失分紀錄");
    expect(sees("對方得失分紀錄")).toBe(false);

    scrollTo(0);
    await waitToSee("選擇球員或對方失誤");
    expect(sees("我方得失分紀錄")).toBe(false);
  });

  it("rests on the unrecorded rally after a reload, whatever the mirrors hold", async () => {
    setFingerDotSupport(true);
    Element.prototype.getAnimations = () => [];
    await mount();

    await waitFor(() =>
      expect(screen.getAllByText("對方得失分紀錄").length).toBeGreaterThan(0),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    expect(sees("選擇球員或對方失誤")).toBe(true);
    expect(sees("我方得失分紀錄")).toBe(false);
    expect(sees("對方得失分紀錄")).toBe(false);
  });

  it("isolates the demo store and SWR cache from user app state", async () => {
    const appStore = makeStore();
    const userGame = { ...demoGame, id: "user-game", teamId: "user-team" };
    appStore.dispatch(
      gameActions.initialize({ game: userGame as never, setIndex: 0 }),
    );
    const userGameState = appStore.getState().game;
    const cachedUserGame = { id: DEMO_GAME_ID, owner: "user-cache" };
    const appCache = new Map([
      [`/api/games/${DEMO_GAME_ID}`, { data: cachedUserGame }],
    ]);
    render(
      <Provider store={appStore}>
        <SWRConfig value={{ provider: () => appCache as never }}>
          <RecordDemo intro={<h2>intro</h2>} />
        </SWRConfig>
      </Provider>,
    );

    scrollTo(3);
    await waitToSee(scoringMoves[SENT_RALLY.awayMoveIndex]!.text);

    expect(appStore.getState().game).toEqual(userGameState);
    expect(appStore.getState().pendingWrites.pending).toHaveLength(0);
    expect(appCache.get(`/api/games/${DEMO_GAME_ID}`)?.data).toBe(
      cachedUserGame,
    );
  });

  it("keeps inert controls out of the accessibility tree", () => {
    render(
      <StepsSection intro={<h2>intro</h2>} onStep={jest.fn()}>
        <button type="button">demo control</button>
      </StepsSection>,
    );
    const frame = screen.getByTestId("steps-frame");

    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute("inert");
  });
});
