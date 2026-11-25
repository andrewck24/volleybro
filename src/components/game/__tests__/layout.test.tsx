import GameLayout from "@/app/game/[gameId]/layout";
import GameOverviewPage from "@/app/game/[gameId]/page";
import GameEntryPage from "@/app/game/[gameId]/sets/[setIndex]/entry/page";
import GameSetsPage from "@/app/game/[gameId]/sets/page";
import { gameActions } from "@/lib/features/game/game-slice";
import { writeKey } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { scoringMoves } from "@/lib/scoring-moves";
import { game, rally } from "@test/support/fixtures/editing-game";
import { deferred } from "@test/support/gates";
import { answerEntries } from "@test/support/msw/entries";
import { server } from "@test/support/msw/server";
import { renderGame } from "@test/support/react/render-game";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useState, type ReactNode } from "react";

jest.mock("next/navigation", () => ({
  useParams: () => ({ gameId: "game-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

const params = Promise.resolve({ gameId: game.id });
const entryPage = (setIndex: string) =>
  GameEntryPage({ params: Promise.resolve({ gameId: game.id, setIndex }) });

const firstSet = game.sets[0]!;
const finishedSet = {
  ...firstSet,
  win: true,
  entries: [{ ...rally, home: { ...rally.home, score: 25 } }],
};
const match = {
  ...game,
  win: null,
  sets: [
    { ...finishedSet, entries: [{ ...finishedSet.entries[0]!, id: "e0" }] },
    finishedSet,
    { ...firstSet, win: null, entries: [] },
  ],
  info: { ...game.info, scoring: { setCount: 5, decidingSetPoints: 15 } },
};

const renderGameRoutes = (initialPage: ReactNode) => {
  let navigate!: (page: ReactNode) => void;
  const Router = () => {
    const [page, setPage] = useState(initialPage);
    navigate = setPage;
    return <GameLayout>{page}</GameLayout>;
  };
  const { store } = renderGame(<Router />, match);
  return { store, navigate: (page: ReactNode) => act(() => navigate(page)) };
};

beforeEach(() => {
  server.use(
    http.get("/api/teams/team-1/players", () => HttpResponse.json([])),
  );
});

it("writes to the recording and edited sets once each across page switches", async () => {
  const user = userEvent.setup();
  const recording = await entryPage("2");
  const betweenSets = await entryPage("0");
  const sets = await GameSetsPage({ params });
  const inFlight = deferred();
  const puts = answerEntries(async ({ body, si }) => {
    if (si === "2") await inFlight.promise;
    return HttpResponse.json({ entries: body });
  });
  const { store, navigate } = renderGameRoutes(recording);
  await screen.findByTestId("summary-drawer");
  act(() => {
    store.dispatch(
      gameActions.setEntryDraftPlayer({ mode: "general", id: "p1", zone: 1 }),
    );
    store.dispatch(
      gameActions.setEntryDraftHomeMove({
        mode: "general",
        move: scoringMoves[3]!,
      }),
    );
  });
  await user.click(await screen.findByTestId("preview-trigger"));
  await waitFor(() => expect(puts.map(({ si }) => si)).toEqual(["2"]));

  navigate(sets);
  await user.click(await screen.findByText("第 2 局"));
  await user.click(await screen.findByRole("button", { name: "查看紀錄" }));
  const entries = await screen.findByRole("dialog", {
    name: "第 2 局逐球記錄",
  });
  await user.click(within(entries).getByText("比賽開始"));
  await user.click(within(entries).getAllByText("發球")[0]!);
  const editor = await screen.findByRole("dialog", { name: /編輯逐球紀錄/ });
  await user.click(within(editor).getByTestId("preview-trigger"));

  navigate(betweenSets);
  expect(await screen.findByRole("button", { name: "新的一局" })).toBeVisible();
  navigate(recording);
  expect(await screen.findByTestId("summary-drawer")).toBeVisible();
  fireEvent(window, new Event("online"));

  await act(async () => inFlight.release());
  await waitFor(() =>
    expect(store.getState().pendingWrites.pending).toEqual([]),
  );
  expect(puts.map(({ si }) => si)).toEqual(["2", "1"]);
  expect(puts[1]!.body).toEqual([expect.objectContaining({ id: rally.id })]);
});

it("sends a scheduled write on the overview after leaving the recording and sets pages", async () => {
  const recording = await entryPage("2");
  const sets = await GameSetsPage({ params });
  const overview = await GameOverviewPage({ params });
  const puts = answerEntries(({ body }) =>
    HttpResponse.json({ entries: body }),
  );
  const queued = { ...rally, id: "queued", at: rally.recordedAt.toISOString() };
  const { store, navigate } = renderGameRoutes(recording);
  expect(await screen.findByTestId("summary-drawer")).toBeVisible();
  act(() => {
    store.dispatch(
      pendingWritesActions.enqueued({
        gameId: game.id,
        setIndex: 2,
        entry: queued,
      }),
    );
    store.dispatch(
      pendingWritesActions.flushFailed({
        keys: [writeKey(queued)],
        retryable: true,
      }),
    );
  });
  navigate(sets);
  expect(await screen.findByText("各局紀錄")).toBeVisible();
  navigate(recording);
  expect(await screen.findByTestId("summary-drawer")).toBeVisible();
  navigate(overview);
  expect(await screen.findByText("賽事總覽")).toBeVisible();
  expect(puts).toHaveLength(0);

  await waitFor(
    () => expect(store.getState().pendingWrites.pending).toEqual([]),
    {
      timeout: 4_000,
    },
  );
  expect(puts.map(({ si }) => si)).toEqual(["2"]);
});
