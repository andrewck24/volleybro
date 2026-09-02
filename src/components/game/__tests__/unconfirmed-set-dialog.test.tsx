import { UnconfirmedSetDialog } from "@/components/game/unconfirmed-set-dialog";
import * as apiClientModule from "@/lib/api/api-client";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { setCompletionActions } from "@/lib/features/game/set-completion-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

const apiClient = apiClientModule.apiClient as jest.Mock;

const mutate = jest.fn();
let mockGame: GameView | undefined;
jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: mockGame, mutate }),
}));

const lastRally = {
  type: "Rally",
  id: "e1",
  seq: 0,
  win: true,
  home: { score: 25, type: 2, num: 0 },
  away: { score: 20, type: 2, num: 0 },
};

const gameWithSet = (win: boolean | null): GameView =>
  ({ id: "game-1", sets: [{ win, entries: [lastRally] }] }) as never;

let store: AppStore;
const renderDialog = () =>
  render(
    <Provider store={store}>
      <UnconfirmedSetDialog gameId="game-1" setIndex={0} />
    </Provider>,
  );

beforeEach(() => {
  store = makeStore();
  mockGame = undefined;
  mutate.mockClear();
});

afterEach(() => {
  apiClient.mockReset();
});

describe("UnconfirmedSetDialog", () => {
  it("renders nothing once the set result is confirmed", () => {
    mockGame = gameWithSet(true);
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: true,
      }),
    );

    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the neutral attempting state while the initial write is in flight", () => {
    mockGame = gameWithSet(true);
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: { id: "e1" } as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );

    renderDialog();

    expect(screen.getAllByText("正在記錄本局結果…").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "重試" }),
    ).not.toBeInTheDocument();
  });

  it("shows the error voice and a retry button once attempts are exhausted", () => {
    mockGame = gameWithSet(true);
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );

    renderDialog();

    expect(screen.getAllByText("哎呀，發球掛網了！").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "重試" })).toBeInTheDocument();
  });

  it("shows the same dialog on a cold start, detected from the fetched win alone", () => {
    mockGame = gameWithSet(null);

    renderDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重試" })).toBeInTheDocument();
  });

  it("has no close button", () => {
    mockGame = gameWithSet(null);

    renderDialog();

    expect(
      screen.queryByRole("button", { name: "關閉" }),
    ).not.toBeInTheDocument();
  });

  it("retrying resends the last rally entry and closes the dialog on success", async () => {
    const user = userEvent.setup();
    mockGame = gameWithSet(true);
    apiClient.mockResolvedValue({
      entries: [lastRally],
      setCompletionConfirmed: true,
    });
    store.dispatch(
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );

    renderDialog();
    await user.click(screen.getByRole("button", { name: "重試" }));

    expect(apiClient).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
