import { EntriesEditDialog } from "@/components/game/options/edit/dialog";
import { PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { deferred } from "@test/support/gates";
import { gameActions } from "@/lib/features/game/game-slice";
import { scoringMoves } from "@/lib/scoring-moves";
import { rally } from "@test/support/fixtures/editing-game";
import { answerEntries } from "@test/support/msw/entries";
import {
  holdEditedWrite,
  renderEditingGame,
} from "@test/support/react/render-editing-game";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse } from "msw";

const renderEntriesEdit = () =>
  renderEditingGame(<EntriesEditDialog gameId="game-1" />);

describe("EntriesEdit back control", () => {
  it("closes the editor when the back button is tapped while idle", async () => {
    const user = userEvent.setup();
    const { store } = renderEntriesEdit();

    const back = await screen.findByRole("button", { name: "back" });
    expect(back).toBeEnabled();

    await user.click(back);

    expect(store.getState().game.editing.entryDraft.id).toBe("");
  });

  it("is disabled while a write is in flight, so it cannot be tapped away", async () => {
    const { store } = renderEntriesEdit();
    holdEditedWrite(store);

    expect(await screen.findByRole("button", { name: "back" })).toBeDisabled();
  });
});

describe("EntriesEdit rally submission", () => {
  it("writes the edited rally under its id and seq, then closes the editor", async () => {
    const user = userEvent.setup();
    const puts = answerEntries(() =>
      HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] }),
    );
    const { store } = renderEntriesEdit();
    await screen.findByRole("button", { name: "back" });
    act(() => {
      store.dispatch(
        gameActions.setEntryDraftHomeMove({
          mode: "editing",
          move: scoringMoves[4]!,
        }),
      );
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() =>
      expect(store.getState().game.editing.entryDraft.id).toBe(""),
    );
    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );
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
      store.dispatch(
        gameActions.setEntryDraftPlayer({ mode: "editing", id: "p1", zone: 1 }),
      );
      store.dispatch(
        gameActions.setEntryDraftHomeMove({
          mode: "editing",
          move: scoringMoves[4]!,
        }),
      );
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );
    expect(puts).toHaveLength(1);
    expect(puts[0]!.body).toMatchObject([{ id: "e1", seq: 0 }]);
  });
});

describe("EntriesEdit after a write that first fails with a server error", () => {
  afterEach(() => jest.useRealTimers());

  it("closes the editor when the background retry finally succeeds", async () => {
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
      store.dispatch(
        gameActions.setEntryDraftHomeMove({
          mode: "editing",
          move: scoringMoves[4]!,
        }),
      );
    });

    await user.click(await screen.findByTestId("preview-trigger"));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(store.getState().game.editing.entryDraft.id).toBeTruthy();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
      );
    });

    await waitFor(() =>
      expect(store.getState().game.editing.entryDraft.id).toBe(""),
    );
    expect(puts).toHaveLength(4);
  });
});

describe("EntriesEdit while the entry's own creation write is still queued", () => {
  it("stays open with the draft intact when that write finishes, and leaves once the edit is written", async () => {
    const user = userEvent.setup();
    const gate = deferred();
    const puts = answerEntries(async (_, attempt) => {
      if (attempt === 1) await gate.promise;
      return HttpResponse.json({ entries: [rally] });
    });
    const { store } = renderEntriesEdit();
    await screen.findByRole("button", { name: "back" });
    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: rally as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
      store.dispatch(
        gameActions.setEntryDraftHomeMove({
          mode: "editing",
          move: scoringMoves[4]!,
        }),
      );
    });
    await waitFor(() => expect(puts).toHaveLength(1));

    gate.release();
    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );

    expect(store.getState().game.editing.entryDraft.id).toBeTruthy();
    expect(store.getState().game.editing.entryDraft.home.num).toBe(
      scoringMoves[4]!.num,
    );
    expect(screen.getByRole("button", { name: "back" })).toBeInTheDocument();

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() =>
      expect(store.getState().game.editing.entryDraft.id).toBe(""),
    );
    expect(puts).toHaveLength(2);
  });
});
