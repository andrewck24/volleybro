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
import { answerSignedInUser } from "../msw/user";
import { SwrIsolation } from "./swr-isolation";

type Options = { editingEntryIndex?: number; selectedPlayerId?: string };

function gameProviders(game: Game, options: Options) {
  const { editingEntryIndex, selectedPlayerId } = options;
  const view = game as unknown as GameView;
  server.use(http.get(`/api/games/${game.id}`, () => HttpResponse.json(game)));
  answerSignedInUser();
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
  const gameLoaded = () => waitFor(() => expect(isLoaded).toBe(true));
  return { store, wrapper, GameProbe, gameLoaded };
}

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
