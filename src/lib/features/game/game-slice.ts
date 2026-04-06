import { EntryType, Side, type Game } from "@/entities/game";
import {
  gamePhaseHelper,
  getPreviousScores,
  getServingStatus,
} from "@/lib/features/game/helpers";
import type {
  ReduxEntryDraft,
  ReduxGameState,
  ReduxStatus,
} from "@/lib/features/game/types";
import { scoringMoves, type ScoringMove } from "@/lib/scoring-moves";
import {
  createSlice,
  type CaseReducer,
  type PayloadAction,
} from "@reduxjs/toolkit";

// Define the initial states
const statusState: ReduxStatus = {
  scores: { home: 0, away: 0 },
  entryIndex: 0,
  isServing: false,
  inProgress: false,
  isSetPoint: false,
  panel: "home",
};

const rallyDetailState: ReduxEntryDraft["home"] = {
  score: 0,
  type: null,
  num: null,
  player: { id: "", zone: 0 },
};

const initialState: ReduxGameState = {
  id: "",
  setIndex: 0,
  mode: "general",
  general: {
    status: statusState,
    entryDraft: {
      win: null,
      home: rallyDetailState,
      away: rallyDetailState,
    },
  },
  editing: {
    status: statusState,
    entryDraft: {
      win: null,
      home: rallyDetailState,
      away: rallyDetailState,
    },
  },
};

// Define the reducers
const initialize: CaseReducer<
  ReduxGameState,
  PayloadAction<{ game: Game; setIndex: number }>
> = (state, action) => {
  const { game, setIndex } = action.payload;
  const set = game.sets[setIndex];
  const entryIndex = set?.entries?.length || 0;
  const { inProgress, isSetPoint } = gamePhaseHelper(
    game,
    setIndex,
    entryIndex,
  );
  const isServing = getServingStatus(set, entryIndex);
  state.id = game.id;
  state.setIndex = setIndex;
  state.mode = "general";
  const status = {
    scores: getPreviousScores(set?.entries, entryIndex),
    entryIndex,
    isServing,
    inProgress,
    isSetPoint,
    panel: "home" as ReduxStatus["panel"],
  };
  state.general.status = { ...state.general.status, ...status };
  state.editing.status = { ...state.editing.status, ...status };
};

const setGameMode: CaseReducer<
  ReduxGameState,
  PayloadAction<ReduxGameState["mode"]>
> = (state, action) => {
  state.mode = action.payload;
};

const setEntryDraftPlayer: CaseReducer<
  ReduxGameState,
  PayloadAction<{ id: string; zone: number }>
> = (state, action) => {
  const { mode } = state;
  const { id, zone } = action.payload;
  const isSamePlayer = id === state[mode].entryDraft.home.player?.id;

  state[mode].status.panel = "home";
  state[mode].entryDraft = {
    ...initialState[mode].entryDraft,
    home: {
      ...initialState[mode].entryDraft.home,
      player: isSamePlayer
        ? initialState[mode].entryDraft.home.player
        : { id, zone },
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].entryDraft.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setEntryDraftHomeMove: CaseReducer<
  ReduxGameState,
  PayloadAction<ScoringMove>
> = (state, action) => {
  const { mode } = state;
  const { win, type, num, outcome } = action.payload;
  const { home, away } = state[mode].status.scores;

  state[mode].status.panel = "away";
  state[mode].entryDraft.win = win;
  state[mode].entryDraft.home = {
    ...state[mode].entryDraft.home,
    score: win ? home + 1 : home,
    type,
    num,
  };
  state[mode].entryDraft.away = {
    ...state[mode].entryDraft.away,
    score: win ? away : away + 1,
    type: scoringMoves[outcome[0]].type,
    num: outcome[0],
  };
};

const setEntryDraftAwayMove: CaseReducer<
  ReduxGameState,
  PayloadAction<ScoringMove>
> = (state, action) => {
  const { mode } = state;
  const { type, num } = action.payload;
  state[mode].entryDraft.away = { ...state[mode].entryDraft.away, type, num };
};

const confirmEntryDraftRally: CaseReducer<
  ReduxGameState,
  PayloadAction<{ inProgress: boolean; isSetPoint: boolean }>
> = (state, action) => {
  const { inProgress, isSetPoint } = action.payload;
  const { mode } = state;
  const { entryIndex } = state[mode].status;

  state[mode].status = {
    ...state[mode].status,
    scores: {
      home: state[mode].entryDraft.home.score,
      away: state[mode].entryDraft.away.score,
    },
    entryIndex: entryIndex + 1,
    isServing: state[mode].entryDraft.win ?? false,
    inProgress,
    isSetPoint,
    panel: "home",
  };

  state[mode].entryDraft = {
    ...initialState[mode].entryDraft,
    home: {
      ...initialState[mode].entryDraft.home,
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].entryDraft.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setEntryDraftSubstitution: CaseReducer<
  ReduxGameState,
  PayloadAction<string>
> = (state, action) => {
  const { mode } = state;
  const inPlayer = action.payload;
  const outPlayer = state[mode].entryDraft.home.player?.id ?? "";
  state[mode].entryDraft = {
    ...state[mode].entryDraft,
    substitution: {
      team: Side.HOME,
      players: { in: inPlayer, out: outPlayer },
    },
  };
};

const resetEntryDraftSubstitution: CaseReducer<ReduxGameState> = (state) => {
  const { mode } = state;
  const { substitution: _substitution, ...rest } = state[mode].entryDraft;
  state[mode].entryDraft = { ...rest };
  state[mode].status.panel = "home";
};

const confirmEntryDraftSubstitution: CaseReducer<ReduxGameState> = (state) => {
  const { mode } = state;
  state[mode].status.panel = "home";
  state[mode].status.entryIndex += 1;
  state[mode].entryDraft = {
    ...initialState[mode].entryDraft,
    home: {
      ...initialState[mode].entryDraft.home,
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].entryDraft.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setPanel: CaseReducer<
  ReduxGameState,
  PayloadAction<ReduxStatus["panel"]>
> = (state, action) => {
  const { mode } = state;
  state[mode].status.panel = action.payload;
};

const resetEntryDraft: CaseReducer<ReduxGameState> = (state) => {
  const { mode } = state;
  state[mode].status.panel = "home";
  state[mode].entryDraft = {
    ...initialState[mode].entryDraft,
    home: {
      ...initialState[mode].entryDraft.home,
      score: state[mode].status.scores.home,
    },
    away: {
      ...initialState[mode].entryDraft.away,
      score: state[mode].status.scores.away,
    },
  };
};

const setEditingEntryStatus: CaseReducer<
  ReduxGameState,
  PayloadAction<{ game: Game; entryIndex: number }>
> = (state, action) => {
  const { setIndex } = state;
  const { game, entryIndex } = action.payload;
  const set = game.sets[setIndex];
  const entry = set.entries[entryIndex];
  const { inProgress, isSetPoint } = gamePhaseHelper(
    game,
    setIndex,
    entryIndex,
  );

  state.mode = "editing";
  state.editing.entryDraft = {
    win: entry.type === EntryType.RALLY ? entry.win : null,
    home:
      entry.type === EntryType.RALLY
        ? entry.home
        : entry.type === EntryType.SUBSTITUTION
          ? {
              ...rallyDetailState,
              player: { id: entry.players.out, zone: 0 },
            }
          : rallyDetailState,
    away: entry.type === EntryType.RALLY ? entry.away : rallyDetailState,
    ...(entry.type === EntryType.SUBSTITUTION
      ? { substitution: entry }
      : entry.type === EntryType.TIMEOUT
        ? { timeout: entry }
        : entry.type === EntryType.CHALLENGE
          ? { challenge: entry }
          : {}),
  };
  state.editing.status = {
    ...state.editing.status,
    isServing: getServingStatus(set, entryIndex),
    scores: getPreviousScores(set?.entries, entryIndex),
    entryIndex,
    inProgress: inProgress,
    isSetPoint: isSetPoint,
    panel: entry.type === EntryType.SUBSTITUTION ? "substitutes" : "away",
  };
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    initialize,
    setGameMode,
    setEntryDraftPlayer,
    setEntryDraftHomeMove,
    setEntryDraftAwayMove,
    confirmEntryDraftRally,
    setEntryDraftSubstitution,
    resetEntryDraftSubstitution,
    confirmEntryDraftSubstitution,
    setPanel,
    resetEntryDraft,
    setEditingEntryStatus,
  },
});

export const gameActions = gameSlice.actions;
export type GameActions = typeof gameActions;

export default gameSlice.reducer;
