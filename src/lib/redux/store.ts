import gameReducer from "@/lib/features/game/game-slice";
import globalReducer from "@/lib/features/global-slice";
import lineupReducer from "@/lib/features/team/lineup-slice";
import { configureStore } from "@reduxjs/toolkit";

export const makeStore = () => {
  return configureStore({
    reducer: {
      global: globalReducer,
      lineup: lineupReducer,
      game: gameReducer,
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
