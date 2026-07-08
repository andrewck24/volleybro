import { GamePanel } from "@/components/game/panel";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("button", { name: "選擇球員" })).toHaveAttribute(
      "aria-current",
      "step",
    );

    await userEvent.click(homeSegment);

    expect(screen.getByRole("button", { name: "選擇球員" })).toHaveAttribute(
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
