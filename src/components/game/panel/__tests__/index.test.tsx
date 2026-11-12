import { GamePanel } from "@/components/game/panel";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

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
    expect(
      screen.getByRole("button", { name: "選擇球員或對方失誤" }),
    ).toHaveAttribute("aria-current", "step");

    await userEvent.click(homeSegment);

    expect(
      screen.getByRole("button", { name: "選擇球員或對方失誤" }),
    ).toHaveAttribute("aria-current", "step");
    expect(homeSegment).toHaveAttribute("aria-disabled", "true");
  });

  it("handles opponent errors without selecting a player", async () => {
    setUpPanel();

    const errorButton = await screen.findByRole("button", {
      name: `對方${scoringMoves[10]!.text}失誤`,
    });

    await userEvent.click(errorButton);

    const segments = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.hasAttribute("aria-current") || btn.hasAttribute("aria-disabled"),
      );
    expect(segments).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "選擇球員或對方失誤" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    ).toHaveAttribute("aria-current", "step");
  });
});

describe("GamePanel step highlight follows the shown moves panel", () => {
  it("keeps the highlighted step and moves body in sync", async () => {
    const reduxStore = setUpPanel();

    act(() => {
      reduxStore.dispatch(
        gameActions.setEntryDraftPlayer({ id: "player-1", zone: 1 }),
      );
      reduxStore.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    expect(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.queryByText("替補")).not.toBeInTheDocument();

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

    await userEvent.click(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    );
    expect(
      screen.getByRole("button", { name: "對方得失分紀錄" }),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.queryByText("替補")).not.toBeInTheDocument();
  });
});
