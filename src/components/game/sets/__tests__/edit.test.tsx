import { SetEdit } from "@/components/game/sets/edit";
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
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { useState } from "react";
import { Provider } from "react-redux";

import { server } from "../../../../../test/msw/server";

let store: AppStore;

const PendingWritesOwner = ({ children }: { children: React.ReactNode }) => (
  <PendingWritesContext.Provider value={usePendingWrites("game-1", 0)}>
    {children}
  </PendingWritesContext.Provider>
);

const Host = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    >
      <SetEdit gameId="game-1" setIndex={0} />
    </Dialog>
  );
};

const renderEditingDialog = (onOpenChange: (open: boolean) => void) =>
  render(
    <SwrIsolation>
      <Provider store={store}>
        <PendingWritesOwner>
          <Host onOpenChange={onOpenChange} />
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

describe("SetEdit editing dismissal", () => {
  it("cannot be dismissed by escape or an outside click while the edit is being written", async () => {
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
    const onOpenChange = jest.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderEditingDialog(onOpenChange);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await user.click(document.body);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(store.getState().game.mode).toBe("editing");
  });

  it("leaves editing mode when the dialog closes", async () => {
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    renderEditingDialog(onOpenChange);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(store.getState().game.mode).toBe("general"));
  });
});
