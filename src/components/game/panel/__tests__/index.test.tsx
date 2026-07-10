import { GamePanel } from "@/components/game/panel";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

const mockGame = { id: "game-1", teams: { home: { players: [] } } };

jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: mockGame, mutate: jest.fn() }),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@/lib/api/error-toast", () => ({
  showErrorToast: jest.fn(),
}));

const setUpPanel = () => {
  const reduxStore = makeStore();
  render(
    <Provider store={reduxStore}>
      <GamePanel gameId="game-1" mode="general" />
    </Provider>,
  );
  return reduxStore;
};

describe("GamePanel entry progress bar", () => {
  it("keeps the active step on player when attempting to reach the home step while player is empty", async () => {
    setUpPanel();

    const homeSegment = screen.getByRole("button", { name: "我方得失分紀錄" });
    expect(homeSegment).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "選擇球員或對方失誤" })).toHaveAttribute(
      "aria-current",
      "step",
    );

    await userEvent.click(homeSegment);

    expect(screen.getByRole("button", { name: "選擇球員或對方失誤" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(homeSegment).toHaveAttribute("aria-disabled", "true");
  });

  it("collapses to a single submittable step when an away-team error is selected", async () => {
    const reduxStore = setUpPanel();

    reduxStore.dispatch(
      gameActions.setEntryDraftPlayer({ id: "player-1", zone: 1 }),
    );
    // scoringMoves[3]: win:false BLOCKING, outcome [4, 10] -> lands on the
    // away step with two possible away moves, one of which (10) is an
    // unforced (away-team) error.
    reduxStore.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]));

    const errorMove = scoringMoves[10];
    const awayErrorButton = await screen.findByRole("button", {
      name: `我方${errorMove.text}失誤`,
    });

    await userEvent.click(awayErrorButton);

    const segments = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.hasAttribute("aria-current") || btn.hasAttribute("aria-disabled"),
      );
    expect(segments).toHaveLength(1);
    expect(screen.getByText("對方失誤，可直接送出")).toBeInTheDocument();
  });
});

// Item 5: the highlighted segment and the shown moves body are a single source
// of truth (status.panel), so switching steps -- forward AND back -- moves both
// together and they can never desync.
describe("GamePanel step highlight follows the shown moves panel", () => {
  it("syncs the highlight and the body when switching home <-> away in both directions", async () => {
    const reduxStore = setUpPanel();

    act(() => {
      reduxStore.dispatch(
        gameActions.setEntryDraftPlayer({ id: "player-1", zone: 1 }),
      );
      // A recorded home move advances the panel to away.
      reduxStore.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]));
    });

    // Away is active + OppoMoves is shown (OursMoves' "替補" is absent).
    expect(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.queryByText("替補")).not.toBeInTheDocument();

    // Go back to home: highlight AND body switch together.
    await userEvent.click(
      screen.getByRole("button", { name: "我方得失分紀錄" }),
    );
    expect(
      screen.getByRole("button", { name: "我方得失分紀錄" }),
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByText("替補")).toBeInTheDocument();

    // Forward to away again: both switch back.
    await userEvent.click(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    );
    expect(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.queryByText("替補")).not.toBeInTheDocument();
  });
});
