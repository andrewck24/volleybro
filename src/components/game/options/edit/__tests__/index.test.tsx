import { EntriesEdit } from "@/components/game/options/edit";
import { Dialog } from "@/components/ui/dialog";
import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { game, rally } from "@/test-utils/editing-game";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { Provider } from "react-redux";

import { server } from "../../../../../../test/msw/server";

let store: AppStore;

const PendingWritesOwner = ({ children }: { children: React.ReactNode }) => (
  <PendingWritesContext.Provider value={usePendingWrites("game-1", 0)}>
    {children}
  </PendingWritesContext.Provider>
);

const renderEntriesEdit = () =>
  render(
    <SwrIsolation>
      <Provider store={store}>
        <PendingWritesOwner>
          <Dialog open>
            <EntriesEdit gameId="game-1" />
          </Dialog>
        </PendingWritesOwner>
      </Provider>
    </SwrIsolation>,
  );

beforeEach(() => {
  server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
  store = makeStore();
  store.dispatch(gameActions.initialize({ game: game as never, setIndex: 0 }));
  store.dispatch(
    gameActions.setEditingEntryStatus({ game: game as never, entryIndex: 0 }),
  );
});

describe("EntriesEdit back control", () => {
  it("leaves editing mode on tap while idle", async () => {
    const user = userEvent.setup();
    renderEntriesEdit();

    const back = await screen.findByRole("button", { name: "back" });
    expect(back).toBeEnabled();

    await user.click(back);

    expect(store.getState().game.mode).toBe("general");
  });

  it("is disabled while a write is in flight, so it cannot be tapped away", async () => {
    server.use(
      http.put("/api/games/game-1/sets/rallies", () => delay("infinite")),
    );
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: rally as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
    renderEntriesEdit();

    expect(await screen.findByRole("button", { name: "back" })).toBeDisabled();
  });
});
