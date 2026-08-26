import gameReducer from "@/lib/features/game/game-slice";
import pendingWritesReducer from "@/lib/features/game/pending-writes-slice";
import setCompletionReducer from "@/lib/features/game/set-completion-slice";
import lineupReducer from "@/lib/features/team/lineup-slice";
import { configureStore } from "@reduxjs/toolkit";

export const makeStore = () => {
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
      }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
