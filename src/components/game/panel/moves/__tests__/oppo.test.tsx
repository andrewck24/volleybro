import {
  OppoMoves,
  useSubmitEntryDraft,
} from "@/components/game/panel/moves/oppo";
import { EntryType, MoveType, Side } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { answerEntries } from "@test/support/msw/entries";
import { useToast } from "@/components/ui/use-toast";
import { PendingWritesOwner } from "@test/support/react/pending-writes-owner";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { server } from "@test/support/msw/server";
import { answerSignedInUser } from "@test/support/msw/user";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";

const rally = {
  id: "e1",
  seq: 0,
  type: EntryType.RALLY,
  win: true,
  home: {
    score: 1,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0, type: MoveType.SERVING, num: 1 },
};
const gameWith = (entries: unknown[]) => ({
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: { home: { players: [{ id: "p1", name: "選手一", number: 4 }] } },
  sets: [{ options: { serve: "home" }, entries }],
});

const useHarness = () => ({
  submit: useSubmitEntryDraft("game-1"),
  game: useGame("game-1").game,
  toasts: useToast().toasts,
});

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SwrIsolation>
    <Provider store={store}>
      <PendingWritesOwner>{children}</PendingWritesOwner>
    </Provider>
  </SwrIsolation>
);

const renderSubmitter = async (
  game: ReturnType<typeof gameWith>,
  options: { editingEntryIndex?: number } = {},
) => {
  store = makeStore();
  server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
  store.dispatch(gameActions.initialize({ game: game as never, setIndex: 0 }));
  if (options.editingEntryIndex !== undefined) {
    store.dispatch(
      gameActions.setEditingEntryStatus({
        game: game as never,
        entryIndex: options.editingEntryIndex,
      }),
    );
  }
  const view = renderHook(useHarness, { wrapper });
  await waitFor(() => expect(view.result.current.game).toBeDefined());
  return view;
};

beforeEach(() => answerSignedInUser());

describe("useSubmitEntryDraft update path", () => {
  it("stays in editing mode when the write fails", async () => {
    answerEntries(() => HttpResponse.error());
    const { result } = await renderSubmitter(gameWith([rally]), {
      editingEntryIndex: 0,
    });
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[4]!));
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(store.getState().game.mode).toBe("editing");
  });

  it("stages nothing while the draft is incomplete, so a retry cannot queue a half-filled rally", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    const { result } = await renderSubmitter(gameWith([rally]), {
      editingEntryIndex: 0,
    });
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(store.getState().pendingWrites.pending).toHaveLength(0);
    expect(puts).toHaveLength(0);
    expect(store.getState().game.mode).toBe("editing");
  });

  it("returns to general mode once the write succeeds", async () => {
    answerEntries(() => HttpResponse.json({ entries: [{ id: "e1", seq: 0 }] }));
    const { result } = await renderSubmitter(gameWith([rally]), {
      editingEntryIndex: 0,
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(store.getState().game.mode).toBe("general");
  });

  it("tells the recorder and queues nothing when the entry being edited is not a rally", async () => {
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    const timeout = {
      id: "e1",
      seq: 0,
      type: EntryType.TIMEOUT,
      team: Side.HOME,
    };
    const { result } = await renderSubmitter(gameWith([timeout]), {
      editingEntryIndex: 0,
    });
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[4]!));
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.toasts[0]).toMatchObject({
      title: "這筆紀錄的類型無法變更",
    });
    expect(store.getState().game.mode).toBe("editing");
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });
});

describe("useSubmitEntryDraft create path", () => {
  it("advances the draft past the recorded entry", async () => {
    answerEntries(() => HttpResponse.json({ entries: [{ id: "new-entry" }] }));
    const { result } = await renderSubmitter(gameWith([]));
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
      store.dispatch(
        gameActions.setEntryDraftAwayMove(
          scoringMoves[scoringMoves[3]!.outcome[0]!]!,
        ),
      );
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(store.getState().game.general.status.entryIndex).toBe(1);
    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );
  });
});

describe("OppoMoves", () => {
  it("stages an away move without submitting it", async () => {
    const homeMove = scoringMoves[3]!;
    const awayMove = scoringMoves[homeMove.outcome[0]!]!;
    const alternateAwayMove = scoringMoves[homeMove.outcome[1]!]!;
    const puts = answerEntries(() => HttpResponse.json({ entries: [] }));
    store = makeStore();
    store.dispatch(
      gameActions.initialize({ game: gameWith([]) as never, setIndex: 0 }),
    );
    store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
    store.dispatch(gameActions.setEntryDraftHomeMove(homeMove));
    render(
      <Provider store={store}>
        <OppoMoves />
      </Provider>,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(alternateAwayMove.text),
      }),
    );

    expect(store.getState().game.general.entryDraft.away.num).toBe(
      alternateAwayMove.num,
    );
    expect(store.getState().game.general.entryDraft.away.num).not.toBe(
      awayMove.num,
    );
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });
});
