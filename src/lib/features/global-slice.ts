import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

type GlobalState = {
  refresh: { isRefreshing: boolean; isPulling: boolean; isDisabled: boolean };
};

const initialState: GlobalState = {
  refresh: { isRefreshing: false, isPulling: false, isDisabled: false },
};

const setIsRefreshing: CaseReducer<GlobalState, PayloadAction<boolean>> = (
  state,
  action
) => {
  state.refresh.isRefreshing = action.payload;
};

const setIsPulling: CaseReducer<GlobalState, PayloadAction<boolean>> = (
  state,
  action
) => {
  state.refresh.isPulling = action.payload;
};

const setIsDisabled: CaseReducer<GlobalState, PayloadAction<boolean>> = (
  state,
  action
) => {
  state.refresh.isDisabled = action.payload;
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setIsRefreshing,
    setIsPulling,
    setIsDisabled,
  },
});

export const globalActions = globalSlice.actions;
export default globalSlice.reducer;
