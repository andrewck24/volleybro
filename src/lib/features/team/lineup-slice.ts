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
  const lineup = state.lineups[lineupIndex];
  if (!lineup) return;
  state.status.edited = true;
  const newStarting = lineup.starting.slice(1);
  // a lineup being rotated always has a full starting six
  newStarting.push(lineup.starting[0]!);
  lineup.starting = newStarting;
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
  const lineup = state.lineups[lineupIndex];
  if (!lineup) return;
  const { liberoReplaceMode, liberoReplacePosition } = action.payload;
  lineup.options.liberoReplaceMode = liberoReplaceMode;
  lineup.options.liberoReplacePosition = liberoReplacePosition;
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
  const lineup = state.lineups[lineupIndex];
  if (!lineup) return;
  if (list === "starting") {
    lineup.starting[zone - 1] = {
      ...lineup.starting[zone - 1],
      id: null,
    };
  } else {
    lineup.liberos.splice(zone - 1, 1);
    if (lineup.options.liberoReplaceMode > lineup.liberos.length) {
      lineup.options.liberoReplaceMode--;
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
  const lineup = state.lineups[lineupIndex];
  if (!lineup) return;
  if (list && zone != null) lineup[list].splice(zone - 1, 1);
  if (list && editingMember.id) {
    lineup[list].push({ id: editingMember.id });
  }
  if (editingMember.list && editingMember.zone != null) {
    lineup[editingMember.list][editingMember.zone - 1] = {
      ...lineup[editingMember.list][editingMember.zone - 1],
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
  const lineup = state.lineups[lineupIndex];
  if (!lineup) return;
  lineup.substitutes.push({ id });
  state.status.edited = true;
};

const removeSubstitutePlayer: CaseReducer<
  ReduxLineupState,
  PayloadAction<string>
> = (state, action) => {
  const { lineupIndex } = state.status;
  const id = action.payload;
  const lineup = state.lineups[lineupIndex];
  if (!lineup) return;
  lineup.substitutes = lineup.substitutes.filter((player) => player.id !== id);
  state.status.edited = true;
};

const setPlayerPosition: CaseReducer<
  ReduxLineupState,
  PayloadAction<Position>
> = (state, action) => {
  const { lineupIndex, editingMember } = state.status;
  const position = action.payload;
  const lineup = state.lineups[lineupIndex];
  if (lineup && editingMember.list && editingMember.zone != null) {
    const target = lineup[editingMember.list][editingMember.zone - 1];
    if (target) {
      lineup[editingMember.list][editingMember.zone - 1] = {
        ...target,
        position,
      };
    }
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
