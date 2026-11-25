import { GamePanel } from "@/components/game/panel";
import { Toaster } from "@/components/ui/toaster";
import { gameActions } from "@/lib/features/game/game-slice";
import { renderEditingGame } from "@test/support/react/render-editing-game";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";

const moveButton = (outcome: "win" | "loss") =>
  screen
    .getAllByRole("button", { name: /攻擊|發球|接發|攔網/ })
    .find((button) => button.getAttribute("data-move-outcome") === outcome)!;

const renderEditingPanel = () =>
  renderEditingGame(
    <>
      <Toaster />
      <GamePanel gameId="game-1" mode="editing" />
    </>,
  );

describe("OursMoves while editing a rally the home side won", () => {
  it("does not switch the rally to a move the home side loses with, and says why", async () => {
    const { store, gameLoaded } = renderEditingPanel();
    await gameLoaded();
    act(() => {
      store.dispatch(gameActions.setPanel({ mode: "editing", panel: "home" }));
    });
    await screen.findAllByRole("button", { name: /攻擊|發球|接發|攔網/ });
    const before = store.getState().game.editing.entryDraft;

    fireEvent.click(moveButton("loss"));

    expect(await screen.findByText("目前無法變更這一球的得分方")).toBeVisible();
    expect(store.getState().game.editing.entryDraft).toEqual(before);
  });

  it("still lets the move change to another one the home side wins with", async () => {
    const { store, gameLoaded } = renderEditingPanel();
    await gameLoaded();
    act(() => {
      store.dispatch(gameActions.setPanel({ mode: "editing", panel: "home" }));
    });
    await screen.findAllByRole("button", { name: /攻擊|發球|接發|攔網/ });
    const winMoves = screen
      .getAllByRole("button", { name: /攻擊|發球|接發|攔網/ })
      .filter((b) => b.getAttribute("data-move-outcome") === "win");

    fireEvent.click(winMoves[0]!);

    await waitFor(() =>
      expect(store.getState().game.editing.entryDraft.win).toBe(true),
    );
    expect(store.getState().game.editing.status.panel).toBe("away");
  });
});
