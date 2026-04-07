import { Position } from "@/entities/team";
import {
  LineupOptionMode,
  type LineupView,
  type ReduxLineupState,
  type ReduxLineupStatus,
} from "@/lib/features/team/types";
import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

const initialState: ReduxLineupState = {
  status: {
    edited: false,
    lineupIndex: 0,
    optionMode: LineupOptionMode.NONE,
    editingMember: { id: null, list: "", zone: null },
  },
  lineups: [],
};

const initialize: CaseReducer<ReduxLineupState, PayloadAction<LineupView[]>> = (
  state,
  action,
) => {
  const lineups = action.payload;
  return {
    ...state,
    status: initialState.status,
    lineups,
  };
};

const rotateLineup: CaseReducer<ReduxLineupState> = (state) => {
  const { lineupIndex } = state.status;
  state.status.edited = true;
  const newStarting = state.lineups[lineupIndex].starting.slice(1);
  newStarting.push(state.lineups[lineupIndex].starting[0]);
  state.lineups[lineupIndex].starting = newStarting;
};

const setLineupIndex: CaseReducer<ReduxLineupState, PayloadAction<number>> = (
  state,
  action,
) => {
  state.status.lineupIndex = action.payload;
};

const setOptionMode: CaseReducer<
  ReduxLineupState,
  PayloadAction<LineupOptionMode>
> = (state, action) => {
  const mode = action.payload;
  state.status.optionMode = mode;
  if (!mode) {
    state.status.editingMember = initialState.status.editingMember;
  }
};

const setLiberoReplace: CaseReducer<
  ReduxLineupState,
  PayloadAction<LineupView["options"]>
> = (state, action) => {
  const { lineupIndex } = state.status;
  const { liberoReplaceMode, liberoReplacePosition } = action.payload;
  state.lineups[lineupIndex].options.liberoReplaceMode = liberoReplaceMode;
  state.lineups[lineupIndex].options.liberoReplacePosition =
    liberoReplacePosition;
  state.status.edited = true;
};

const setEditingPlayer: CaseReducer<
  ReduxLineupState,
  PayloadAction<ReduxLineupStatus["editingMember"]>
> = (state, action) => {
  const { id, list, zone } = action.payload;
  if (
    list === state.status.editingMember.list &&
    zone === state.status.editingMember.zone
  ) {
    state.status.editingMember = initialState.status.editingMember;
    state.status.optionMode = LineupOptionMode.NONE;
  } else {
    state.status.editingMember = { id, list, zone };
    state.status.optionMode = id
      ? LineupOptionMode.PLAYERINFO
      : LineupOptionMode.SUBSTITUTES;
  }
};

const removeEditingPlayer: CaseReducer<ReduxLineupState> = (state) => {
  const { lineupIndex } = state.status;
  const { list, zone } = state.status.editingMember;
  if (zone == null) return;
  if (list === "starting") {
    state.lineups[lineupIndex].starting[zone - 1] = {
      ...state.lineups[lineupIndex].starting[zone - 1],
      id: null,
    };
  } else {
    state.lineups[lineupIndex].liberos.splice(zone - 1, 1);
    if (
      state.lineups[lineupIndex].options.liberoReplaceMode >
      state.lineups[lineupIndex].liberos.length
    ) {
      state.lineups[lineupIndex].options.liberoReplaceMode--;
    }
  }
  state.status = {
    ...state.status,
    edited: true,
    editingMember: initialState.status.editingMember,
    optionMode: initialState.status.optionMode,
  };
};

const replaceEditingPlayer: CaseReducer<
  ReduxLineupState,
  PayloadAction<ReduxLineupStatus["editingMember"]>
> = (state, action) => {
  const { lineupIndex } = state.status;
  const { id, list, zone } = action.payload;
  const editingMember = state.status.editingMember;
  if (list && zone != null)
    state.lineups[lineupIndex][list].splice(zone - 1, 1);
  if (list && editingMember.id) {
    state.lineups[lineupIndex][list].push({ id: editingMember.id });
  }
  if (editingMember.list && editingMember.zone != null) {
    state.lineups[lineupIndex][editingMember.list][editingMember.zone - 1] = {
      ...state.lineups[lineupIndex][editingMember.list][editingMember.zone - 1],
      id,
    };
  }
  state.status.edited = true;
  state.status.editingMember.id = id;
  state.status.optionMode = LineupOptionMode.PLAYERINFO;
};

const addSubstitutePlayer: CaseReducer<
  ReduxLineupState,
  PayloadAction<string>
> = (state, action) => {
  const { lineupIndex } = state.status;
  const id = action.payload;
  state.lineups[lineupIndex].substitutes.push({ id });
  state.status.edited = true;
};

const removeSubstitutePlayer: CaseReducer<
  ReduxLineupState,
  PayloadAction<string>
> = (state, action) => {
  const { lineupIndex } = state.status;
  const id = action.payload;
  state.lineups[lineupIndex].substitutes = state.lineups[
    lineupIndex
  ].substitutes.filter((player) => player.id !== id);
  state.status.edited = true;
};

const setPlayerPosition: CaseReducer<
  ReduxLineupState,
  PayloadAction<Position>
> = (state, action) => {
  const { lineupIndex, editingMember } = state.status;
  const position = action.payload;
  if (editingMember.list && editingMember.zone != null) {
    state.lineups[lineupIndex][editingMember.list][editingMember.zone - 1] = {
      ...state.lineups[lineupIndex][editingMember.list][editingMember.zone - 1],
      position,
    };
  }
  state.status = {
    ...state.status,
    edited: true,
    lineupIndex: state.status.lineupIndex,
    optionMode: LineupOptionMode.PLAYERINFO,
  };
};

const lineupSlice = createSlice({
  name: "lineup",
  initialState,
  reducers: {
    initialize,
    rotateLineup,
    setLineupIndex,
    setOptionMode,
    setLiberoReplace,
    setEditingPlayer,
    removeEditingPlayer,
    replaceEditingPlayer,
    addSubstitutePlayer,
    removeSubstitutePlayer,
    setPlayerPosition,
  },
});

export const lineupActions = lineupSlice.actions;
export type LineupActions = typeof lineupActions;

export default lineupSlice.reducer;
