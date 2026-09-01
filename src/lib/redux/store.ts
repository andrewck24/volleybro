import gameReducer from "@/lib/features/game/game-slice";
import { createPendingWritesPersistence } from "@/lib/features/game/pending-writes-persistence";
import pendingWritesReducer from "@/lib/features/game/pending-writes-slice";
import {
  localStoragePendingWrites,
  type PendingWritesStorage,
} from "@/lib/features/game/pending-writes-storage";
import setCompletionReducer from "@/lib/features/game/set-completion-slice";
import lineupReducer from "@/lib/features/team/lineup-slice";
import { configureStore } from "@reduxjs/toolkit";

// A parameter only so a test can hand in a fake; the default is what ships.
export const makeStore = (
  storage: PendingWritesStorage = localStoragePendingWrites,
) => {
  return configureStore({
    reducer: {
      lineup: lineupReducer,
      game: gameReducer,
      pendingWrites: pendingWritesReducer,
      setCompletion: setCompletionReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).prepend(createPendingWritesPersistence(storage)),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
