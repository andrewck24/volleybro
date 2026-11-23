import { EntriesEdit } from "@/components/game/options/edit";
import { Dialog } from "@/components/ui/dialog";
import { PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS } from "@/lib/features/game/pending-writes";
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

const renderEntriesEdit = () =>
  renderEditingGame(
    <Dialog open>
      <EntriesEdit gameId="game-1" />
    </Dialog>,
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
  it("writes the edited rally under its id and seq, then returns to general mode", async () => {
    const user = userEvent.setup();
    const puts = answerEntries(() =>
      HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] }),
    );
    const { store } = renderEntriesEdit();
    await screen.findByRole("button", { name: "back" });
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[4]!));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() => expect(store.getState().game.mode).toBe("general"));
    expect(puts).toHaveLength(1);
    expect(puts[0]!.body).toMatchObject([{ id: "e1", seq: 0 }]);
  });

  it("keeps the rally's id and seq when the player is changed before submitting", async () => {
    const user = userEvent.setup();
    const puts = answerEntries(() =>
      HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] }),
    );
    const { store } = renderEntriesEdit();
    await screen.findByRole("button", { name: "back" });
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[4]!));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.body).toMatchObject([{ id: "e1", seq: 0 }]);
  });
});

describe("EntriesEdit after a write that first fails with a server error", () => {
  afterEach(() => jest.useRealTimers());

  it("leaves editing mode when the background retry finally succeeds", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const puts = answerEntries((_, attempt) =>
      attempt <= 3
        ? HttpResponse.json({ code: "UNKNOWN" }, { status: 503 })
        : HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] }),
    );
    const { store } = renderEntriesEdit();
    await screen.findByRole("button", { name: "back" });
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[4]!));
    });

    await user.click(await screen.findByTestId("preview-trigger"));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(store.getState().game.mode).toBe("editing");

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
      );
    });

    await waitFor(() => expect(store.getState().game.mode).toBe("general"));
    expect(puts).toHaveLength(4);
  });
});
