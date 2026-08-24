import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

/**
 * D3/D4: whether `completeSet` was confirmed for a set, keyed by gameId and
 * setIndex. This is not a copy of anything derivable -- the local cache is
 * already optimistically written to match entries by the time a response
 * arrives, so the only place this fact exists is the flush response itself
 * (see design "偵測機制"). Session-only by construction: the store is never
 * persisted, so a reload naturally falls back to the cold-start comparison
 * instead of a stale value here.
 */
export type SetCompletionState = Record<string, boolean>;

const initialState: SetCompletionState = {};

export const setCompletionKey = (gameId: string, setIndex: number): string =>
  `${gameId}:${setIndex}`;

/** Undefined means no submit-time signal has been recorded this session. */
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
