import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

export type SetCompletionState = Record<string, boolean>;

const initialState: SetCompletionState = {};

export const setCompletionKey = (gameId: string, setIndex: number): string =>
  `${gameId}:${setIndex}`;

export const readSetCompletion = (
  state: SetCompletionState,
  gameId: string,
  setIndex: number,
): boolean | undefined => state[setCompletionKey(gameId, setIndex)];

const recorded: CaseReducer<
  SetCompletionState,
  PayloadAction<{ gameId: string; setIndex: number; confirmed: boolean }>
> = (state, action) => {
  const { gameId, setIndex, confirmed } = action.payload;
  state[setCompletionKey(gameId, setIndex)] = confirmed;
};

const setCompletionSlice = createSlice({
  name: "setCompletion",
  initialState,
  reducers: { recorded },
});

export const setCompletionActions = setCompletionSlice.actions;
export default setCompletionSlice.reducer;
