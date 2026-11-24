import {
  EntryType,
  Side,
  deriveServingStatus,
  deriveSetPhase,
  deriveSetStats,
  setTargetPoints,
} from "@/entities/game";
import { getPreviousScores } from "@/lib/features/game/helpers";
import type {
  GameDraftMode,
  GameView,
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

const statusState: ReduxStatus = {
  scores: { home: 0, away: 0 },
  entryIndex: 0,
  isServing: false,
  isSetInProgress: false,
  isSetPoint: false,
  panel: "home",
  stats: deriveSetStats(undefined, { options: { serve: "home" } }),
};

const rallyDetailState: ReduxEntryDraft["home"] = {
  score: 0,
  type: null,
  num: null,
  player: { id: "", zone: 0 },
};

const entryDraftState: ReduxEntryDraft = {
  id: "",
  seq: 0,
  win: null,
  home: rallyDetailState,
  away: rallyDetailState,
};

const initialState: ReduxGameState = {
  id: "",
  setIndex: 0,
  general: { status: statusState, entryDraft: entryDraftState },
  editing: {
    status: statusState,
    entryDraft: entryDraftState,
    editWriteKey: null,
  },
};

const initialize: CaseReducer<
  ReduxGameState,
  PayloadAction<{ game: GameView; setIndex: number }>
> = (state, action) => {
  const { game, setIndex } = action.payload;
  const set = game.sets[setIndex];
  const entryIndex = set?.entries?.length || 0;
  const { isSetInProgress, isSetPoint } = deriveSetPhase(
    set,
    entryIndex,
    setTargetPoints(game.info.scoring, setIndex),
  );
  const isServing = deriveServingStatus(set, entryIndex);
  const stats = deriveSetStats(set?.entries, {
    options: set?.options ?? { serve: "home" },
  });
  const isSameSet = state.id === game.id && state.setIndex === setIndex;
  const generalPanel = isSameSet ? state.general.status.panel : "home";
  state.id = game.id;
  state.setIndex = setIndex;
  if (!isSameSet) state.editing = initialState.editing;
  state.general.status = {
    scores: getPreviousScores(set?.entries, entryIndex),
    entryIndex,
    isServing,
    isSetInProgress,
    isSetPoint,
    panel: generalPanel,
    stats,
  };
};

const closeEntryEdit: CaseReducer<ReduxGameState> = (state) => {
  state.editing = initialState.editing;
};

const editWriteStaged: CaseReducer<ReduxGameState, PayloadAction<string>> = (
  state,
  action,
) => {
  state.editing.editWriteKey = action.payload;
};

const setEntryDraftPlayer: CaseReducer<
  ReduxGameState,
  PayloadAction<{ mode: GameDraftMode; id: string; zone: number }>
> = (state, action) => {
  const { mode, id, zone } = action.payload;
  const draft = state[mode];
  const isSamePlayer = id === draft.entryDraft.home.player?.id;

  draft.status.panel = "home";
  const { id: entryId, seq } = draft.entryDraft;
  draft.entryDraft = {
    ...entryDraftState,
    id: entryId,
    seq,
    home: {
      ...entryDraftState.home,
      player: isSamePlayer ? entryDraftState.home.player : { id, zone },
      score: draft.status.scores.home,
    },
    away: {
      ...entryDraftState.away,
      score: draft.status.scores.away,
    },
  };
};

const setEntryDraftHomeMove: CaseReducer<
  ReduxGameState,
  PayloadAction<{ mode: GameDraftMode; move: ScoringMove }>
> = (state, action) => {
  const { mode, move } = action.payload;
  const draft = state[mode];
  const { win, type, num, outcome } = move;
  const { home, away } = draft.status.scores;
  const [outcomeNum = 0] = outcome;

  draft.status.panel = "away";
  draft.entryDraft.win = win;
  draft.entryDraft.home = {
    ...draft.entryDraft.home,
    score: win ? home + 1 : home,
    type,
    num,
  };
  draft.entryDraft.away = {
    ...draft.entryDraft.away,
    score: win ? away : away + 1,
    type: scoringMoves[outcomeNum]?.type ?? null,
    num: outcomeNum,
  };
};

const setEntryDraftAwayMove: CaseReducer<
  ReduxGameState,
  PayloadAction<{ mode: GameDraftMode; move: ScoringMove }>
> = (state, action) => {
  const {
    mode,
    move: { type, num },
  } = action.payload;
  const draft = state[mode];
  draft.entryDraft.away = { ...draft.entryDraft.away, type, num };
};

const confirmEntryDraftRally: CaseReducer<
  ReduxGameState,
  PayloadAction<{ isSetInProgress: boolean; isSetPoint: boolean }>
> = (state, action) => {
  const { isSetInProgress, isSetPoint } = action.payload;
  const draft = state.general;
  const { entryIndex } = draft.status;

  draft.status = {
    ...draft.status,
    scores: {
      home: draft.entryDraft.home.score,
      away: draft.entryDraft.away.score,
    },
    entryIndex: entryIndex + 1,
    isServing: draft.entryDraft.win ?? false,
    isSetInProgress,
    isSetPoint,
    panel: "home",
  };

  draft.entryDraft = {
    ...entryDraftState,
    home: {
      ...entryDraftState.home,
      score: draft.status.scores.home,
    },
    away: {
      ...entryDraftState.away,
      score: draft.status.scores.away,
    },
  };
};

const setEntryDraftSubstitution: CaseReducer<
  ReduxGameState,
  PayloadAction<{ mode: GameDraftMode; playerId: string }>
> = (state, action) => {
  const { mode, playerId } = action.payload;
  const draft = state[mode];
  const outPlayer = draft.entryDraft.home.player?.id;
  if (!outPlayer) return;
  draft.entryDraft = {
    ...draft.entryDraft,
    substitution: {
      team: Side.HOME,
      players: { in: playerId, out: outPlayer },
    },
  };
};

const resetEntryDraftSubstitution: CaseReducer<
  ReduxGameState,
  PayloadAction<{ mode: GameDraftMode }>
> = (state, action) => {
  const { mode } = action.payload;
  const draft = state[mode];
  const { substitution: _substitution, ...rest } = draft.entryDraft;
  draft.entryDraft = { ...rest };
  draft.status.panel = "home";
};

const confirmEntryDraftSubstitution: CaseReducer<ReduxGameState> = (state) => {
  const draft = state.general;
  draft.status.panel = "home";
  draft.status.entryIndex += 1;
  draft.entryDraft = {
    ...entryDraftState,
    home: {
      ...entryDraftState.home,
      score: draft.status.scores.home,
    },
    away: {
      ...entryDraftState.away,
      score: draft.status.scores.away,
    },
  };
};

const setPanel: CaseReducer<
  ReduxGameState,
  PayloadAction<{ mode: GameDraftMode; panel: ReduxStatus["panel"] }>
> = (state, action) => {
  const { mode, panel } = action.payload;
  state[mode].status.panel = panel;
};

const resetEntryDraft: CaseReducer<ReduxGameState> = (state) => {
  const draft = state.general;
  draft.status.panel = "home";
  draft.entryDraft = {
    ...entryDraftState,
    home: {
      ...entryDraftState.home,
      score: draft.status.scores.home,
    },
    away: {
      ...entryDraftState.away,
      score: draft.status.scores.away,
    },
  };
};

const setEditingEntryStatus: CaseReducer<
  ReduxGameState,
  PayloadAction<{ game: GameView; entryIndex: number }>
> = (state, action) => {
  const { setIndex } = state;
  const { game, entryIndex } = action.payload;
  const set = game.sets[setIndex];
  const entry = set?.entries[entryIndex];
  if (!entry) return;
  const { isSetInProgress, isSetPoint } = deriveSetPhase(
    set,
    entryIndex,
    setTargetPoints(game.info.scoring, setIndex),
  );

  state.editing.editWriteKey = null;
  state.editing.entryDraft = {
    id: entry.id,
    seq: entry.seq,
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
    stats: deriveSetStats(set.entries, { options: set.options }),
    isServing: deriveServingStatus(set, entryIndex),
    scores: getPreviousScores(set?.entries, entryIndex),
    entryIndex,
    isSetInProgress,
    isSetPoint: isSetPoint,
    panel: entry.type === EntryType.SUBSTITUTION ? "substitutes" : "away",
  };
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    initialize,
    closeEntryEdit,
    editWriteStaged,
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
