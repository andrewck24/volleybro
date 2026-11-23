import Game from "@/components/game";
import { GamePanel } from "@/components/game/panel";
import { EntryType, MoveType } from "@/entities/game";
import { hasFailedWrite } from "@/lib/features/game/pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { createGame } from "@test/support/fixtures/entities";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";

import { server } from "@test/support/msw/server";
import { answerSignedInUser } from "@test/support/msw/user";
import { pointerEvent } from "@test/support/dom/pointer-event";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const moveStats = () => ({
  [MoveType.SERVING]: { success: 0, error: 0 },
  [MoveType.RECEPTION]: { success: 0, error: 0 },
  [MoveType.ATTACK]: { success: 0, error: 0 },
  [MoveType.BLOCKING]: { success: 0, error: 0 },
  [MoveType.DEFENSE]: { success: 0, error: 0 },
  [MoveType.SETTING]: { success: 0, error: 0 },
});

const lineups = {
  home: {
    options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
    starting: ["p1", "p2", "p3", "p4", "p5", "p6"].map((id) => ({ id })),
    liberos: [],
    substitutes: [],
  },
};

const makeMockGame = () => ({
  id: "game-1",
  win: null,
  teamId: "team-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  sets: [
    {
      win: null,
      options: { serve: "home" },
      startingLineups: lineups,
      lineups,
      entries: [
        {
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
  teams: {
    home: {
      id: "team-1",
      players: [
        { id: "p1", name: "選手一", number: 4, stats: [moveStats()] },
        { id: "p2", name: "選手二", number: 7, stats: [moveStats()] },
        ...[3, 4, 5, 6].map((n) => ({
          id: `p${n}`,
          name: `選手${n}`,
          number: n + 5,
          stats: [moveStats()],
        })),
      ],
      staffs: [],
      stats: [
        {
          ...moveStats(),
          [MoveType.UNFORCED]: { success: 0, error: 0 },
          rotation: 0,
          timeout: 2,
          substitution: 6,
          challenge: 2,
        },
      ],
    },
    away: {
      id: "team-2",
      players: [],
      staffs: [],
      stats: [
        {
          ...moveStats(),
          [MoveType.UNFORCED]: { success: 0, error: 0 },
          rotation: 0,
          timeout: 2,
          substitution: 6,
          challenge: 2,
        },
      ],
    },
  },
});

const setUpGame = ({ failWrites = false } = {}) => {
  const game = makeMockGame();
  const puts: { home: { player: { id: string } } }[] = [];
  server.use(
    http.get("/api/games/game-1", () => HttpResponse.json(game)),
    http.put("/api/games/game-1/sets/entries", async ({ request }) => {
      if (failWrites)
        return HttpResponse.json({ code: "VALIDATION" }, { status: 400 });
      const sent = (await request.json()) as typeof puts;
      puts.push(...sent);
      for (const entry of sent) {
        const recorded = {
          type: EntryType.RALLY,
          ...entry,
        } as (typeof game.sets)[0]["entries"][0];
        const at = game.sets[0]!.entries.findIndex(
          (e) => (e as { id?: string }).id === (entry as { id?: string }).id,
        );
        if (at >= 0) game.sets[0]!.entries[at] = recorded;
        else game.sets[0]!.entries.push(recorded);
      }
      return HttpResponse.json({ entries: game.sets[0]!.entries });
    }),
  );
  const store = makeStore();
  render(
    <Provider store={store}>
      <SwrIsolation>
        <Game gameId="game-1" setIndex={0} />
      </SwrIsolation>
    </Provider>,
  );
  return { store, puts };
};

beforeEach(() => answerSignedInUser());

describe("Game gesture split, wired through the real composition", () => {
  it("submitting the next set from the interval screen POSTs with an index equal to the existing set count", async () => {
    const user = userEvent.setup();
    const set = createGame().sets[0]!;
    const completedSet = {
      ...set,
      entries: set.entries.map((entry) =>
        entry.type === EntryType.RALLY
          ? {
              ...entry,
              home: { ...entry.home, score: 25 },
              away: { ...entry.away, score: 20 },
            }
          : entry,
      ),
    };
    let submittedSetIndex: string | null = null;
    const game = createGame({
      win: null,
      sets: [completedSet, { ...completedSet, win: null, entries: [] }],
    });
    server.use(
      http.get("/api/games/game-1", () => HttpResponse.json(game)),
      http.post("/api/games/game-1/sets", ({ request }) => {
        submittedSetIndex = new URL(request.url).searchParams.get("si");
        return HttpResponse.json(game);
      }),
    );
    render(
      <Provider store={makeStore()}>
        <SwrIsolation>
          <Game gameId="game-1" setIndex={0} />
        </SwrIsolation>
      </Provider>,
    );

    await user.click(await screen.findByRole("button", { name: "新的一局" }));

    expect(
      await screen.findByRole("heading", { name: "第 3 局設定" }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "開始新一局" }));

    await waitFor(() => expect(submittedSetIndex).toBe("2"));
  });

  it("tapping the handle expands the drawer from the idle peek", async () => {
    const user = userEvent.setup();
    setUpGame();

    expect(await screen.findByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("summary-drawer-handle"));

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  it("in-progress Preview tap with complete steps submits via the real dispatch path and does not expand", async () => {
    const user = userEvent.setup();
    const { store, puts } = setUpGame();

    await screen.findByTestId("summary-drawer");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );

    await user.click(screen.getByTestId("summary-drawer-handle"));
    const rows = await screen.findAllByTestId("summary-drawer-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("7");
    expect(rows[1]).toHaveTextContent("4");
    expect(screen.queryByTestId("preview-card")).not.toBeInTheDocument();
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.home.player.id).toBe("p2");
  });

  it("in-progress Preview tap with incomplete steps does nothing (no submit, no expand)", async () => {
    const user = userEvent.setup();
    const { store, puts } = setUpGame();

    await screen.findByTestId("summary-drawer");
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
    expect(puts).toHaveLength(0);
  });

  it("drawer stays expanded showing the draft Preview while input is in progress, and Escape collapses it", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();

    await screen.findByTestId("summary-drawer");
    await user.click(screen.getByTestId("summary-drawer-handle"));
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );

    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p2", zone: 1 }));
    });

    expect(await screen.findByTestId("preview-card")).toBeInTheDocument();
    expect(screen.getAllByTestId("summary-drawer-row")).toHaveLength(1);

    await user.keyboard("{Escape}");
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });
});

describe("Game rally edit started from the summary drawer", () => {
  const startEditing = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByTestId("summary-drawer-handle"));
    await user.click(await screen.findByTestId("entry-row"));
    await user.click(await screen.findByTestId("entry-action-edit"));
    await screen.findByRole("button", { name: "back" });
  };

  it("closes the edit dialog and shows the expanded drawer once the edit is submitted", async () => {
    const user = userEvent.setup();
    const { store, puts } = setUpGame();
    await startEditing(user);
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() => expect(puts).toHaveLength(1));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "數據總覽" }),
      ).not.toBeInTheDocument(),
    );
    expect(store.getState().game.mode).toBe("general");
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  it("keeps the edit dialog open in editing mode when the write fails", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame({ failWrites: true });
    await startEditing(user);
    act(() => {
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
    });

    await user.click(await screen.findByTestId("preview-trigger"));

    await waitFor(() =>
      expect(
        hasFailedWrite(
          store.getState().pendingWrites,
          store.getState().game.editing.entryDraft.id,
        ),
      ).toBe(true),
    );
    expect(store.getState().game.mode).toBe("editing");
    expect(store.getState().game.editing.entryDraft.home.num).toBe(
      scoringMoves[3]!.num,
    );
    expect(screen.getByRole("button", { name: "back" })).toBeInTheDocument();
  });

  it("closes the edit dialog and shows the expanded drawer when the back control is used", async () => {
    const user = userEvent.setup();
    const { store } = setUpGame();
    await startEditing(user);

    await user.click(screen.getByRole("button", { name: "back" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "數據總覽" }),
      ).not.toBeInTheDocument(),
    );
    expect(store.getState().game.mode).toBe("general");
    expect(screen.getByTestId("summary-drawer")).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });
});

describe("GamePanel moves gesture", () => {
  it("captures the pointer gesture before child controls receive a click", () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <GamePanel gameId="game-1" mode="general" />
      </Provider>,
    );
    act(() => {
      store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
      store.dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[3]!));
      store.dispatch(gameActions.setPanel("away"));
    });
    const move = screen.getByRole("button", { name: "我方攔網失誤" });
    const awayMoveBeforeSwipe =
      store.getState().game.general.entryDraft.away.num;
    expect(awayMoveBeforeSwipe).toBe(scoringMoves[3]!.outcome[0]);
    expect(move).toHaveTextContent("我方攔網失誤");

    fireEvent(move, pointerEvent("pointerdown", 100));
    fireEvent(move, pointerEvent("pointermove", 40));
    fireEvent(move, pointerEvent("pointerup", 40));
    fireEvent.click(move);

    expect(store.getState().game.general.entryDraft.away.num).toBe(
      awayMoveBeforeSwipe,
    );
  });
});
