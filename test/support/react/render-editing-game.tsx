import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { AppStore } from "@/lib/redux/store";
import { act } from "@testing-library/react";
import { delay, http } from "msw";
import type { ReactNode } from "react";
import { game, rally } from "../fixtures/editing-game";
import { server } from "../msw/server";
import { renderGame } from "./render-game";

const PendingWritesOwner = ({ children }: { children: ReactNode }) => (
  <PendingWritesContext.Provider value={usePendingWrites("game-1", 0)}>
    {children}
  </PendingWritesContext.Provider>
);

/** Renders `ui` on a real store that is already editing the fixture game's first entry. */
export function renderEditingGame(ui: ReactNode) {
  return renderGame(<PendingWritesOwner>{ui}</PendingWritesOwner>, game, {
    editingEntryIndex: 0,
  });
}

/** Queues the edited rally and keeps its write in flight for the rest of the test. */
export function holdEditedWrite(store: AppStore) {
  server.use(
    http.put("/api/games/game-1/sets/rallies", () => delay("infinite")),
  );
  act(() => {
    store.dispatch(
      pendingWritesActions.enqueued({
        entry: rally as never,
        gameId: "game-1",
        setIndex: 0,
      }),
    );
  });
}
