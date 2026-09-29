import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { render } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { game, rally } from "../fixtures/editing-game";
import { server } from "../msw/server";
import { SwrIsolation } from "./swr-isolation";

const PendingWritesOwner = ({ children }: { children: ReactNode }) => (
  <PendingWritesContext.Provider value={usePendingWrites("game-1", 0)}>
    {children}
  </PendingWritesContext.Provider>
);

/** Renders `ui` on a real store that is already editing the fixture game's first entry. */
export function renderEditingGame(ui: ReactNode) {
  server.use(http.get("/api/games/game-1", () => HttpResponse.json(game)));
  const store: AppStore = makeStore();
  store.dispatch(gameActions.initialize({ game: game as never, setIndex: 0 }));
  store.dispatch(
    gameActions.setEditingEntryStatus({ game: game as never, entryIndex: 0 }),
  );
  return {
    store,
    ...render(
      <SwrIsolation>
        <Provider store={store}>
          <PendingWritesOwner>{ui}</PendingWritesOwner>
        </Provider>
      </SwrIsolation>,
    ),
  };
}

/** Queues the edited rally and keeps its write in flight for the rest of the test. */
export function holdEditedWrite(store: AppStore) {
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
}
