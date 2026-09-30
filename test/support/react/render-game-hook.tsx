import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { act, render, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { server } from "../msw/server";
import { SwrIsolation } from "./swr-isolation";

type Options = { editingEntryIndex?: number; selectedPlayerId?: string };

function gameProviders(game: { id: string }, options: Options) {
  const { editingEntryIndex, selectedPlayerId } = options;
  server.use(http.get(`/api/games/${game.id}`, () => HttpResponse.json(game)));
  const store = makeStore();
  store.dispatch(gameActions.initialize({ game: game as never, setIndex: 0 }));
  if (editingEntryIndex !== undefined)
    store.dispatch(
      gameActions.setEditingEntryStatus({
        game: game as never,
        entryIndex: editingEntryIndex,
      }),
    );
  if (selectedPlayerId)
    store.dispatch(
      gameActions.setEntryDraftPlayer({ id: selectedPlayerId, zone: 1 }),
    );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SwrIsolation>
      <Provider store={store}>{children}</Provider>
    </SwrIsolation>
  );
  return { store, wrapper };
}

/**
 * Renders `useHook` on a real store initialised for `game`'s first set, with the
 * game served over MSW. With `editingEntryIndex` the store is editing that entry;
 * `selectedPlayerId` taps that player on court.
 * `useHook` receives the store so it can read the status and draft the app would.
 */
export function renderGameHook<T>(
  game: { id: string },
  useHook: (store: AppStore) => T,
  options: Options = {},
) {
  const { store, wrapper } = gameProviders(game, options);
  return { store, ...renderHook(() => useHook(store), { wrapper }) };
}

/** Renders `ui` on the same real store and served game as `renderGameHook`. */
export function renderGame(
  ui: ReactNode,
  game: { id: string },
  options: Options = {},
) {
  const { store, wrapper } = gameProviders(game, options);
  return { store, ...render(ui, { wrapper }) };
}

/** Resolves once the served game has reached the hook, for asserting on what it does not show. */
export async function gameServed() {
  await new Promise<void>((resolve) => {
    const onResponse = () => {
      server.events.removeListener("response:mocked", onResponse);
      resolve();
    };
    server.events.on("response:mocked", onResponse);
  });
  await act(async () => {});
}
