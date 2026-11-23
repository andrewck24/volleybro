import { EntriesEdit } from "@/components/game/options/edit";
import { Dialog } from "@/components/ui/dialog";
import { useGame } from "@/hooks/use-data";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useEffect, useRef } from "react";
import { gameActions } from "@/lib/features/game/game-slice";
import { scoringMoves } from "@/lib/scoring-moves";
import { answerEntries } from "@test/support/msw/entries";
import {
  holdEditedWrite,
  renderEditingGame,
} from "@test/support/react/render-editing-game";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse } from "msw";

const ReinitializeOnGameChange = () => {
  const { game } = useGame("game-1");
  const dispatch = useAppDispatch();
  const loaded = useRef<typeof game>(undefined);
  useEffect(() => {
    if (!game) return;
    if (loaded.current && game !== loaded.current)
      dispatch(gameActions.initialize({ game, setIndex: 0 }));
    loaded.current = game;
  }, [game, dispatch]);
  return null;
};

const renderEntriesEdit = () =>
  renderEditingGame(
    <>
      <ReinitializeOnGameChange />
      <Dialog open>
        <EntriesEdit gameId="game-1" />
      </Dialog>
    </>,
  );

describe("EntriesEdit back control", () => {
  it("leaves editing mode on tap while idle", async () => {
    const user = userEvent.setup();
    const { store } = renderEntriesEdit();

    const back = await screen.findByRole("button", { name: "back" });
    expect(back).toBeEnabled();

    await user.click(back);

    expect(store.getState().game.mode).toBe("general");
  });

  it("is disabled while a write is in flight, so it cannot be tapped away", async () => {
    const { store } = renderEntriesEdit();
    holdEditedWrite(store);

    expect(await screen.findByRole("button", { name: "back" })).toBeDisabled();
  });
});

describe("EntriesEdit rally submission", () => {
  it("writes the edited rally under its id and seq, then returns to general mode without moving the next entry", async () => {
    const user = userEvent.setup();
    const puts = answerEntries(() =>
      HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] }),
    );
    const { store } = renderEntriesEdit();
    await screen.findByRole("button", { name: "back" });
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() => expect(store.getState().game.mode).toBe("general"));
    expect(store.getState().game.general.status.entryIndex).toBe(1);
    expect(puts).toHaveLength(1);
    expect(puts[0]!.body).toMatchObject([{ id: "e1", seq: 0 }]);
  });
});
