import type { Game } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { render, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { server } from "../msw/server";
import { SwrIsolation } from "./swr-isolation";

type Options = { editingEntryIndex?: number; selectedPlayerId?: string };

function gameProviders(game: Game, options: Options) {
  const { editingEntryIndex, selectedPlayerId } = options;
  const view = game as unknown as GameView;
  server.use(http.get(`/api/games/${game.id}`, () => HttpResponse.json(game)));
  const store = makeStore();
  store.dispatch(gameActions.initialize({ game: view, setIndex: 0 }));
  if (editingEntryIndex !== undefined)
    store.dispatch(
      gameActions.setEditingEntryStatus({
        game: view,
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
  let isLoaded = false;
  const GameProbe = () => {
    isLoaded = !!useGame(game.id).game;
    return null;
  };
  /** Resolves once the served game is in the store's data layer, so "shows nothing" can be told from "not loaded yet". */
  const gameLoaded = () => waitFor(() => expect(isLoaded).toBe(true));
  return { store, wrapper, GameProbe, gameLoaded };
}

/**
 * Renders `ui` on a real store initialised for `game`'s first set, with the game
 * served over MSW. With `editingEntryIndex` the store is editing that entry;
 * `selectedPlayerId` taps that player on court.
 */
export function renderGame(ui: ReactNode, game: Game, options: Options = {}) {
  const { store, wrapper, GameProbe, gameLoaded } = gameProviders(
    game,
    options,
  );
  return {
    store,
    gameLoaded,
    ...render(
      <>
        <GameProbe />
        {ui}
      </>,
      { wrapper },
    ),
  };
}

/**
 * Renders `useHook` on the same store and served game as `renderGame`.
 * `useHook` receives the store so it can read the status and draft the app would.
 */
export function renderGameHook<T>(
  game: Game,
  useHook: (store: AppStore) => T,
  options: Options = {},
) {
  const { store, wrapper, GameProbe, gameLoaded } = gameProviders(
    game,
    options,
  );
  return {
    store,
    gameLoaded,
    ...renderHook(() => useHook(store), {
      wrapper: ({ children }) =>
        wrapper({
          children: (
            <>
              <GameProbe />
              {children}
            </>
          ),
        }),
    }),
  };
}
