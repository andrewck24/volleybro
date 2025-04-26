import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  matchPhaseHelper,
  getServingStatus,
  getPreviousScores,
} from "@/lib/features/record/helpers";

import {
  type Record,
  type Substitution,
  type Timeout,
  type Challenge,
  type RallyDetail,
  Side,
  EntryType,
  Rally,
} from "@/entities/record";
import type {
  ReduxRecordState,
  ReduxStatus,
} from "@/lib/features/record/types";
import { scoringMoves, type ScoringMove } from "@/lib/scoring-moves";

// Define the initial states
const statusState: ReduxStatus = {
  scores: { home: 0, away: 0 },
  setIndex: 0,
  entryIndex: 0,
  isServing: false,
  inProgress: false,
  isSetPoint: false,
  panel: "home",
};

const rallyDetailState: RallyDetail = {
  score: 0,
  type: null,
  num: null,
  player: { _id: "", zone: 0 },
};

const initialState: ReduxRecordState = {
  _id: "",
  mode: "general",
  general: {
    status: statusState,
    recording: {
      win: null,
      home: rallyDetailState,
      away: rallyDetailState,
    },
  },
  editing: {
    status: statusState,
    recording: {
      win: null,
      home: rallyDetailState,
      away: rallyDetailState,
    },
  },
};

// Define the reducers
const initialize: CaseReducer<ReduxRecordState, PayloadAction<Record>> = (
  state,
  action
) => {
  const record = action.payload;
  const setIndex = record.sets.length ? record.sets.length - 1 : 0;
  const entryIndex = record.sets[setIndex]?.entries?.length || 0;
  const set = record.sets[setIndex];
  const { inProgress, isSetPoint } = matchPhaseHelper(
    record,
    setIndex,
    entryIndex
  );
  const isServing = getServingStatus(set, entryIndex);
  state._id = record._id;
  const status = {
    scores: getPreviousScores(set?.entries, entryIndex),
    setIndex:
      !setIndex && !set?.entries ? 0 : inProgress ? setIndex : setIndex + 1,
    entryIndex,
    isServing,
    inProgress,
    isSetPoint,
    panel: "home" as ReduxStatus["panel"],
  };
  state.general.status = { ...state.general.status, ...status };
  state.editing.status = { ...state.editing.status, ...status };
};

const setRecordMode: CaseReducer<
  ReduxRecordState,
  PayloadAction<ReduxRecordState["mode"]>
> = (state, action) => {
  state.mode = action.payload;
};

const setRecordingPlayer: CaseReducer<
  ReduxRecordState,
  PayloadAction<{ _id: string; zone: number }>
> = (state, action) => {
  const { mode } = state;
  const { _id, zone } = action.payload;
  const isSamePlayer = _id === state[mode].recording.home.player._id;

  state[mode].status.panel = "home";
  state[mode].recording = {
    ...initialState[mode].recording,
    home: {
      ...initialState[mode].recording.home,
      player: isSamePlayer
        ? initialState[mode].recording.home.player
        : { _id, zone },
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].recording.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setRecordingHomeMove: CaseReducer<
  ReduxRecordState,
  PayloadAction<ScoringMove>
> = (state, action) => {
  const { mode } = state;
  const { win, type, num, outcome } = action.payload;
  const { home, away } = state[mode].status.scores;

  state[mode].status.panel = "away";
  state[mode].recording.win = win;
  state[mode].recording.home = {
    ...state[mode].recording.home,
    score: win ? home + 1 : home,
    type,
    num,
  };
  state[mode].recording.away = {
    ...state[mode].recording.away,
    score: win ? away : away + 1,
    type: scoringMoves[outcome[0]].type,
    num: outcome[0],
  };
};

const setRecordingAwayMove: CaseReducer<
  ReduxRecordState,
  PayloadAction<ScoringMove>
> = (state, action) => {
  const { mode } = state;
  const { type, num } = action.payload;
  state[mode].recording.away = { ...state[mode].recording.away, type, num };
};

const confirmRecordingRally: CaseReducer<
  ReduxRecordState,
  PayloadAction<{ inProgress: boolean; isSetPoint: boolean }>
> = (state, action) => {
  const { inProgress, isSetPoint } = action.payload;
  const { mode } = state;
  const { setIndex, entryIndex } = state[mode].status;

  state[mode].status = {
    ...state[mode].status,
    scores: {
      home: state[mode].recording.home.score,
      away: state[mode].recording.away.score,
    },
    setIndex: inProgress ? setIndex : setIndex + 1,
    entryIndex: entryIndex + 1,
    isServing: state[mode].recording.win,
    inProgress,
    isSetPoint,
    panel: "home",
  };

  state[mode].recording = {
    ...initialState[mode].recording,
    home: {
      ...initialState[mode].recording.home,
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].recording.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setRecordingSubstitution: CaseReducer<
  ReduxRecordState,
  PayloadAction<string>
> = (state, action) => {
  const { mode } = state;
  const inPlayer = action.payload;
  const { _id: outPlayer } = state[mode].recording.home.player;
  state[mode].recording = {
    ...state[mode].recording,
    substitution: {
      team: Side.HOME,
      players: { in: inPlayer, out: outPlayer },
    },
  };
};

const resetRecordingSubstitution: CaseReducer<ReduxRecordState> = (state) => {
  const { mode } = state;
  const { substitution, ...rest } = state[mode].recording;
  state[mode].recording = { ...rest };
  state[mode].status.panel = "home";
};

const confirmRecordingSubstitution: CaseReducer<ReduxRecordState> = (state) => {
  const { mode } = state;
  state[mode].status.panel = "home";
  state[mode].status.entryIndex += 1;
  state[mode].recording = {
    ...initialState[mode].recording,
    home: {
      ...initialState[mode].recording.home,
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].recording.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setPanel: CaseReducer<
  ReduxRecordState,
  PayloadAction<ReduxStatus["panel"]>
> = (state, action) => {
  const { mode } = state;
  state[mode].status.panel = action.payload;
};

const resetRecording: CaseReducer<ReduxRecordState> = (state) => {
  const { mode } = state;
  state[mode].status.panel = "home";
  state[mode].recording = {
    ...initialState[mode].recording,
    home: {
      ...initialState[mode].recording.home,
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].recording.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setSetIndex: CaseReducer<ReduxRecordState, PayloadAction<number>> = (
  state,
  action
) => {
  // TODO: 刪除 general, editing 的區別
  state.general.status.setIndex = action.payload;
};

const setEditingEntryStatus: CaseReducer<
  ReduxRecordState,
  PayloadAction<{ record: Record; setIndex: number; entryIndex: number }>
> = (state, action) => {
  const { record, setIndex, entryIndex } = action.payload;
  const set = record.sets[setIndex];
  const entry = set.entries[entryIndex];
  const { inProgress, isSetPoint } = matchPhaseHelper(
    record,
    setIndex,
    entryIndex
  );

  state.mode = "editing";
  state.editing.recording = {
    win: entry.type === EntryType.RALLY ? (entry.data as Rally).win : null,
    home:
      entry.type === EntryType.RALLY
        ? (entry.data as Rally).home
        : entry.type === EntryType.SUBSTITUTION
        ? {
            ...rallyDetailState,
            player: { _id: (entry.data as Substitution).players.out, zone: 0 },
          }
        : rallyDetailState,
    away:
      entry.type === EntryType.RALLY
        ? (entry.data as Rally).away
        : rallyDetailState,
    ...(entry.type === EntryType.SUBSTITUTION
      ? { substitution: entry.data as Substitution }
      : entry.type === EntryType.TIMEOUT
      ? { timeout: entry.data as Timeout }
      : entry.type === EntryType.CHALLENGE
      ? { challenge: entry.data as Challenge }
      : entry.data),
  };
  state.editing.status = {
    ...state.editing.status,
    isServing: getServingStatus(set, entryIndex),
    scores: getPreviousScores(set?.entries, entryIndex),
    setIndex,
    entryIndex,
    inProgress: inProgress,
    isSetPoint: isSetPoint,
    panel: entry.type === EntryType.SUBSTITUTION ? "substitutes" : "away",
  };
};

const recordSlice = createSlice({
  name: "record",
  initialState,
  reducers: {
    initialize,
    setRecordMode,
    setRecordingPlayer,
    setRecordingHomeMove,
    setRecordingAwayMove,
    confirmRecordingRally,
    setRecordingSubstitution,
    resetRecordingSubstitution,
    confirmRecordingSubstitution,
    setPanel,
    resetRecording,
    setSetIndex,
    setEditingEntryStatus,
  },
});

export const recordActions = recordSlice.actions;
export type RecordActions = typeof recordActions;

export default recordSlice.reducer;
