import { GamePreview } from "@/components/game/preview";
import { SummaryDrawer } from "@/components/game/summary-drawer";
import { useSubmitEntryDraft } from "@/components/game/panel/moves/oppo";
import { EntryType, MoveType } from "@/entities/game";
import {
  PendingWritesContext,
  usePendingWrites,
  usePendingWritesContext,
} from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS } from "@/lib/features/game/pending-writes";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";

import { server } from "@test/support/msw/server";
import { answerSignedInUser } from "@test/support/msw/user";
import { deferred } from "@test/support/gates";

const PendingWritesTestHarness = ({
  gameId,
  setIndex,
  children,
}: {
  gameId: string;
  setIndex: number;
  children: React.ReactNode;
}) => {
  const pendingWrites = usePendingWrites(gameId, setIndex);
  return (
    <PendingWritesContext.Provider value={pendingWrites}>
      {children}
    </PendingWritesContext.Provider>
  );
};

const mockGame = {
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: {
    home: {
      players: [
        { id: "p1", number: 4 },
        { id: "p2", number: 7 },
      ],
    },
  },
  sets: [
    {
      options: { serve: "home" },
      entries: [
        {
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
        },
      ],
    },
  ],
};

const emptyGame = {
  ...mockGame,
  sets: [{ entries: [], options: { serve: "home" } }],
};

const SEND_LABEL = "送出";

const renderPreview = (
  store: ReturnType<typeof makeStore>,
  ui: React.ReactNode,
  game: unknown = mockGame,
) =>
  render(
    <Provider store={store}>
      <SWRConfig
        value={{
          provider: () =>
            new Map([["/api/games/game-1", { data: game }]]) as never,
          dedupingInterval: 0,
        }}
      >
        <PendingWritesTestHarness gameId="game-1" setIndex={0}>
          {ui}
        </PendingWritesTestHarness>
      </SWRConfig>
    </Provider>,
  );

const initializedStore = (game: unknown = mockGame) => {
  const store = makeStore();
  act(() => {
    store.dispatch(
      gameActions.initialize({ game: game as never, setIndex: 0 }),
    );
  });
  return store;
};

const setUpPreview = (
  onSubmit = jest.fn(),
  onExpandDrawer: (() => void) | undefined = jest.fn(),
) => {
  const store = initializedStore();
  renderPreview(
    store,
    <GamePreview
      gameId="game-1"
      mode="general"
      onSubmit={onSubmit}
      onExpandDrawer={onExpandDrawer}
    />,
  );
  return { store, onSubmit, onExpandDrawer };
};

const SubmittingPreview = ({ mode }: { mode: "general" | "editing" }) => {
  const pendingWrites = usePendingWritesContext();
  const submit = useSubmitEntryDraft("game-1", pendingWrites);
  return <GamePreview gameId="game-1" mode={mode} onSubmit={submit} />;
};

beforeEach(() => answerSignedInUser());

describe("GamePreview send affordance", () => {
  it("does not show the send icon while a step is incomplete", () => {
    const { store } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("shows the send icon once every step is complete", () => {
    const { store } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    expect(screen.getByRole("img", { name: SEND_LABEL })).toBeInTheDocument();
  });
});

describe("GamePreview submission", () => {
  it("freezes and demotes the draft to the previous entry on submit", async () => {
    const user = userEvent.setup();
    const { store, onSubmit } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: SEND_LABEL })).toBeInTheDocument();

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("7")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("shows the previous score after submitting an edit", async () => {
    const user = userEvent.setup();
    const firstEntry = mockGame.sets[0]!.entries[0]!;
    const secondEntry = {
      ...firstEntry,
      id: "e2",
      seq: 1,
      home: {
        ...firstEntry.home,
        score: 2,
        player: { id: "p2", zone: 1 },
      },
    };
    const fullGame = {
      ...mockGame,
      sets: [{ ...mockGame.sets[0]!, entries: [firstEntry, secondEntry] }],
    };
    const store = initializedStore(fullGame);
    act(() => {
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: fullGame as never,
          entryIndex: 1,
        }),
      );
    });
    const onSubmit = jest.fn();
    renderPreview(
      store,
      <GamePreview gameId="game-1" mode="editing" onSubmit={onSubmit} />,
      fullGame,
    );

    expect(screen.getByText("7")).toBeInTheDocument();
    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("7")).not.toBeInTheDocument();
  });

  it("advances create state before its queued write resolves", async () => {
    const user = userEvent.setup();
    const createGate = deferred();
    let requestCount = 0;
    server.use(
      http.put("/api/games/game-1/sets/entries", async ({ request }) => {
        const sent = (await request.json()) as { id: string }[];
        requestCount++;
        await createGate.promise;
        return HttpResponse.json({ entries: sent });
      }),
    );

    const createStore = initializedStore();
    act(() => {
      createStore.dispatch(
        gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }),
      );
      createStore.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
      createStore.dispatch(
        gameActions.setEntryDraftAwayMove(
          scoringMoves[scoringMoves[3]!.outcome[0]!]!,
        ),
      );
    });
    const view = renderPreview(
      createStore,
      <SubmittingPreview mode="general" />,
    );

    await user.click(screen.getByTestId("preview-trigger"));
    await waitFor(() => expect(requestCount).toBe(1));
    expect(createStore.getState().game.general.status.entryIndex).toBe(2);
    expect(createStore.getState().pendingWrites.pending).toHaveLength(1);
    createGate.release();
    await waitFor(() =>
      expect(createStore.getState().pendingWrites.pending).toHaveLength(0),
    );
    view.unmount();
  });

  it("shares one in-progress draft between Preview and the Summary drawer", () => {
    const store = initializedStore();
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });
    renderPreview(
      store,
      <>
        <GamePreview gameId="game-1" mode="general" />
        <SummaryDrawer gameId="game-1" state="expanded" />
      </>,
    );

    const previews = screen.getAllByTestId("preview-card");
    expect(previews).toHaveLength(2);
    previews.forEach((preview) => expect(preview).toHaveTextContent("7"));
  });

  it("resets preview freeze state when the entry identity changes", async () => {
    const user = userEvent.setup();
    const firstEntry = mockGame.sets[0]!.entries[0]!;
    const secondEntry = {
      ...firstEntry,
      id: "e2",
      seq: 1,
      home: {
        ...firstEntry.home,
        score: 2,
        player: { id: "p2", zone: 1 },
      },
    };
    const game = {
      ...mockGame,
      sets: [{ ...mockGame.sets[0]!, entries: [firstEntry, secondEntry] }],
    };
    const store = initializedStore(game);
    act(() => {
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: game as never,
          entryIndex: 0,
        }),
      );
    });
    renderPreview(store, <GamePreview gameId="game-1" mode="editing" />, game);

    await user.click(screen.getByTestId("preview-trigger"));
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();

    act(() => {
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: game as never,
          entryIndex: 1,
        }),
      );
    });

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: SEND_LABEL })).toBeInTheDocument();
  });
});

describe("GamePreview empty-entries guard", () => {
  it("renders nothing when the entry would be undefined (entryIndex 0, no draft)", () => {
    renderPreview(
      initializedStore(emptyGame),
      <GamePreview gameId="game-1" mode="general" />,
      emptyGame,
    );

    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-trigger")).not.toBeInTheDocument();
  });

  it("does not throw when freezing the first entry (no previous entry)", async () => {
    const user = userEvent.setup();
    const store = initializedStore(emptyGame);
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    const onSubmit = jest.fn();
    renderPreview(
      store,
      <GamePreview gameId="game-1" mode="general" onSubmit={onSubmit} />,
      emptyGame,
    );

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();
  });
});

describe("GamePreview editing write status", () => {
  const queuedEntry = { id: "e1", seq: 0, win: true, home: {}, away: {} };

  const setUpEditing = () => {
    const store = makeStore();
    act(() => {
      store.dispatch(
        gameActions.initialize({ game: mockGame as never, setIndex: 0 }),
      );
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: mockGame as never,
          entryIndex: 0,
        }),
      );
    });
    const onSubmit = jest.fn();
    renderPreview(
      store,
      <GamePreview gameId="game-1" mode="editing" onSubmit={onSubmit} />,
    );
    return { store, onSubmit };
  };

  it("shows a progress indicator instead of the send affordance while the write is scheduled, and ignores taps", async () => {
    const user = userEvent.setup();
    const { store, onSubmit } = setUpEditing();

    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: queuedEntry as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
      store.dispatch(
        pendingWritesActions.flushFailed({
          ids: ["e1"],
          retryable: true,
        }),
      );
    });

    expect(screen.getByRole("status", { name: "送出中" })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: SEND_LABEL }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("preview-trigger"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps edit progress on the edited entry until its write resolves", async () => {
    const gate = deferred();
    let sent: unknown;
    server.use(
      http.put("/api/games/game-1/sets/entries", async ({ request }) => {
        sent = await request.json();
        await gate.promise;
        return HttpResponse.json({ entries: [queuedEntry] });
      }),
    );
    const store = makeStore();
    act(() => {
      store.dispatch(
        gameActions.initialize({ game: mockGame as never, setIndex: 0 }),
      );
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: mockGame as never,
          entryIndex: 0,
        }),
      );
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
      store.dispatch(
        gameActions.setEntryDraftAwayMove(
          scoringMoves[scoringMoves[3]!.outcome[0]!]!,
        ),
      );
    });
    const user = userEvent.setup();
    renderPreview(store, <SubmittingPreview mode="editing" />);

    await user.click(screen.getByTestId("preview-trigger"));
    await waitFor(() =>
      expect(sent).toEqual([expect.objectContaining({ id: "e1" })]),
    );
    expect(screen.getByTestId("preview-card")).toHaveTextContent("4");
    expect(screen.getByRole("status", { name: "送出中" })).toBeInTheDocument();
    expect(store.getState().game.mode).toBe("editing");
    expect(store.getState().game.editing.status.entryIndex).toBe(0);

    gate.release();
    await waitFor(() => expect(store.getState().game.mode).toBe("general"));
  });

  it("prevents a click retry from racing a scheduled background flush", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    const gate = deferred();
    const sent: unknown[] = [];
    server.use(
      http.put("/api/games/game-1/sets/entries", async ({ request }) => {
        sent.push(await request.json());
        await gate.promise;
        return HttpResponse.json({
          entries: [queuedEntry, { ...queuedEntry, id: "e2" }],
        });
      }),
    );
    const store = makeStore();
    act(() => {
      store.dispatch(
        gameActions.initialize({ game: mockGame as never, setIndex: 0 }),
      );
      store.dispatch(
        gameActions.setEditingEntryStatus({
          game: mockGame as never,
          entryIndex: 0,
        }),
      );
      for (const entry of [queuedEntry, { ...queuedEntry, id: "e2" }]) {
        store.dispatch(
          pendingWritesActions.enqueued({
            entry: entry as never,
            gameId: "game-1",
            setIndex: 0,
          }),
        );
      }
      store.dispatch(
        pendingWritesActions.flushFailed({
          ids: ["e1"],
          retryable: false,
          lastError: { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 },
        }),
      );
      store.dispatch(
        pendingWritesActions.flushFailed({
          ids: ["e2"],
          retryable: true,
          lastError: {
            code: "TRANSIENT",
            reason: "NETWORK_ERROR",
            status: 503,
          },
        }),
      );
    });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    try {
      renderPreview(store, <GamePreview gameId="game-1" mode="editing" />);
      await user.click(screen.getByRole("button", { name: "重試" }));
      await waitFor(() => expect(sent).toHaveLength(1));

      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[0]!,
        );
      });
      expect(sent).toHaveLength(1);

      gate.release();
      await waitFor(() =>
        expect(store.getState().pendingWrites.pending).toHaveLength(0),
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          PENDING_WRITE_BACKGROUND_RETRY_DELAYS_MS[1]!,
        );
      });
      expect(sent).toHaveLength(1);
    } finally {
      gate.release();
      jest.useRealTimers();
    }
  });

  it("shows a retry control once the write is refused, and retry resends the entry", async () => {
    const user = userEvent.setup();
    let sent: unknown;
    server.use(
      http.put("/api/games/game-1/sets/entries", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ entries: [queuedEntry] });
      }),
    );
    const { store } = setUpEditing();

    act(() => {
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: queuedEntry as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
      store.dispatch(
        pendingWritesActions.flushFailed({
          ids: ["e1"],
          retryable: false,
          lastError: { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 },
        }),
      );
    });

    expect(store.getState().pendingWrites.pending[0]!.nextAttemptAt).toBeNull();
    await user.click(screen.getByRole("button", { name: "重試" }));

    await waitFor(() =>
      expect(store.getState().pendingWrites.pending).toHaveLength(0),
    );
    expect(sent).toEqual([queuedEntry]);
  });
});

describe("GamePreview gesture split", () => {
  it("expands the drawer on tap while idle (no draft in progress)", async () => {
    const user = userEvent.setup();
    const { onExpandDrawer, onSubmit } = setUpPreview();

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onExpandDrawer).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits and does not expand the drawer when in progress and complete", async () => {
    const user = userEvent.setup();
    const { store, onExpandDrawer, onSubmit } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onExpandDrawer).not.toHaveBeenCalled();
  });

  it("does nothing (no submit, no expand) when in progress and incomplete", async () => {
    const user = userEvent.setup();
    const { store, onExpandDrawer, onSubmit } = setUpPreview();

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    await user.click(screen.getByTestId("preview-trigger"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onExpandDrawer).not.toHaveBeenCalled();
  });
});
