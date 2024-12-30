import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { matchPhaseHelper } from "@/lib/features/record/helpers";

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
  rallyIndex: 0,
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
  const rallyIndex = record.sets[setIndex]?.rallies?.length || 0;
  const previousRally = record.sets[setIndex]?.rallies[rallyIndex - 1];
  const { inProgress, isSetPoint } = matchPhaseHelper(
    record,
    setIndex,
    previousRally
  );
  const isServing = previousRally
    ? previousRally.win
    : record.sets[setIndex]?.options?.serve === "home";
  state._id = record._id;
  const status = {
    scores: {
      home: previousRally?.home?.score || 0,
      away: previousRally?.away?.score || 0,
    },
    setIndex: inProgress ? setIndex : setIndex + 1,
    rallyIndex,
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
  PayloadAction<Record>
> = (state, action) => {
  const record = structuredClone(action.payload);
  const { mode } = state;
  const { setIndex, rallyIndex } = state[mode].status;
  const { inProgress, isSetPoint } = matchPhaseHelper(
    record,
    setIndex,
    state[mode].recording
  );

  state[mode].status = {
    ...state[mode].status,
    scores: {
      home: state[mode].recording.home.score,
      away: state[mode].recording.away.score,
    },
    setIndex: inProgress ? setIndex : setIndex + 1,
    rallyIndex: rallyIndex + 1,
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
  state[mode].status.rallyIndex += 1;
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
  state.editing.status.setIndex = action.payload;
};

// TODO: 修正編輯狀態之 isSetPoint 計算邏輯
const setEditingEntryStatus: CaseReducer<
  ReduxRecordState,
  PayloadAction<{ record: Record; rallyIndex: number }>
> = (state, action) => {
  const { record, rallyIndex } = action.payload;
  const { setIndex } = state.editing.status;

  const previousRally = record.sets[setIndex]?.rallies[rallyIndex - 1];
  const entry = record.sets[setIndex].rallies[rallyIndex];

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
    isServing: previousRally
      ? previousRally.win
      : record.sets[setIndex].options.serve === "home",
    scores: {
      home: previousRally ? previousRally.home.score : 0,
      away: previousRally ? previousRally.away.score : 0,
    },
    rallyIndex,
    inProgress: true,
    isSetPoint: false,
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
