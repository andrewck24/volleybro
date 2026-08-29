import {
  EntryType,
  MatchCategory,
  MatchDivision,
  MatchPhase,
  MoveType,
  Side,
  type DerivedSetStats,
  type EntryIdentity,
} from "@/entities/game";
import type { AppErrorCode } from "@/entities/errors";
import { Position as TeamPosition } from "@/entities/team";
import type { LineupList } from "@/lib/features/team/types";
import { z } from "zod";

const StatEntryResponseSchema = z.object({
  success: z.number(),
  error: z.number(),
});

const PlayerStatsResponseSchema = z.object({
  [MoveType.SERVING]: StatEntryResponseSchema,
  [MoveType.BLOCKING]: StatEntryResponseSchema,
  [MoveType.ATTACK]: StatEntryResponseSchema,
  [MoveType.RECEPTION]: StatEntryResponseSchema,
  [MoveType.DEFENSE]: StatEntryResponseSchema,
  [MoveType.SETTING]: StatEntryResponseSchema,
});

export const TeamStatsResponseSchema = PlayerStatsResponseSchema.extend({
  [MoveType.UNFORCED]: StatEntryResponseSchema,
  rotation: z.number(),
  timeout: z.number(),
  substitution: z.number(),
  challenge: z.number(),
});

const GamePlayerResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.number(),
});

const StaffResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.number(),
  position: z.enum(["", "C", "AC", "T", "M"]),
});

const LineupPlayerResponseSchema = z.object({
  id: z.string().nullable(),
  position: z.nativeEnum(TeamPosition).optional(),
  sub: z
    .object({
      id: z.string().nullable(),
      entryIndex: z.object({
        in: z.number().optional(),
        out: z.number().optional(),
      }),
    })
    .optional(),
});

const LineupResponseSchema = z.object({
  options: z.object({
    liberoReplaceMode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    liberoReplacePosition: z.enum([
      TeamPosition.NONE,
      TeamPosition.OH,
      TeamPosition.MB,
      TeamPosition.OP,
    ]),
  }),
  starting: z.array(LineupPlayerResponseSchema),
  liberos: z.array(LineupPlayerResponseSchema),
  substitutes: z.array(LineupPlayerResponseSchema),
});

export const GameTeamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  players: z.array(GamePlayerResponseSchema),
  staffs: z.array(StaffResponseSchema),
  lineup: LineupResponseSchema.optional(),
});

export const MatchResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  number: z.number().optional(),
  phase: z.nativeEnum(MatchPhase).optional(),
  division: z.nativeEnum(MatchDivision).optional(),
  category: z.nativeEnum(MatchCategory).optional(),
  scoring: z.object({
    setCount: z.number(),
    decidingSetPoints: z.number(),
  }),
  location: z
    .object({
      city: z.string().optional(),
      hall: z.string().optional(),
    })
    .optional(),
  time: z
    .object({
      date: z.coerce.date().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  weather: z
    .object({
      temperature: z.number(),
    })
    .optional(),
});

const RallyPlayerResponseSchema = z.object({
  id: z.string(),
  zone: z.number(),
});

const RallyDetailResponseSchema = z.object({
  score: z.number(),
  type: z.nativeEnum(MoveType),
  num: z.number(),
  player: RallyPlayerResponseSchema.optional(),
});

const RallyResponseSchema = z.object({
  win: z.boolean(),
  home: RallyDetailResponseSchema,
  away: RallyDetailResponseSchema,
});

const SubstitutionResponseSchema = z.object({
  team: z.nativeEnum(Side),
  players: z.object({
    in: z.string(),
    out: z.string(),
  }),
});

const TimeoutResponseSchema = z.object({
  team: z.nativeEnum(Side),
});

const ChallengeResponseSchema = z.object({
  team: z.nativeEnum(Side),
  challengeType: z.string(),
  success: z.boolean(),
});

// A stable identity and an ordering position, generated on the client before
// the optimistic update runs. See entities/game.ts's EntryIdentity for why
// they are separate fields.
const EntryIdentityResponseSchema = z.object({
  id: z.string(),
  seq: z.number(),
});

export const EntryResponseSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal(EntryType.RALLY) })
    .merge(EntryIdentityResponseSchema)
    .merge(RallyResponseSchema),
  z
    .object({ type: z.literal(EntryType.SUBSTITUTION) })
    .merge(EntryIdentityResponseSchema)
    .merge(SubstitutionResponseSchema),
  z
    .object({ type: z.literal(EntryType.TIMEOUT) })
    .merge(EntryIdentityResponseSchema)
    .merge(TimeoutResponseSchema),
  z
    .object({ type: z.literal(EntryType.CHALLENGE) })
    .merge(EntryIdentityResponseSchema)
    .merge(ChallengeResponseSchema),
]);

export const SetResponseSchema = z.object({
  win: z.boolean().nullable(),
  lineups: z.object({
    home: LineupResponseSchema,
    away: LineupResponseSchema.optional(),
  }),
  options: z.object({
    serve: z.enum(["home", "away"]),
    time: z
      .object({
        start: z.string(),
        end: z.string(),
      })
      .optional(),
  }),
  entries: z.array(EntryResponseSchema),
});

const GameSummaryTeamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sets: z.number(),
  scores: z.array(z.number()),
});

export const GameSummaryResponseSchema = z.object({
  id: z.string(),
  win: z.boolean().nullable(),
  info: MatchResponseSchema,
  teams: z.object({
    home: GameSummaryTeamResponseSchema,
    away: GameSummaryTeamResponseSchema,
  }),
});

export const GameResponseSchema = z.object({
  id: z.string(),
  win: z.boolean().nullable(),
  teamId: z.string(),
  info: MatchResponseSchema,
  teams: z.object({
    home: GameTeamResponseSchema,
    away: GameTeamResponseSchema,
  }),
  sets: z.array(SetResponseSchema),
});

export type MatchView = z.infer<typeof MatchResponseSchema>;
export type GamePlayerView = z.infer<typeof GamePlayerResponseSchema>;
export type TeamStatsView = z.infer<typeof TeamStatsResponseSchema>;
export type RallyDetailView = z.infer<typeof RallyDetailResponseSchema>;
export type RallyView = z.infer<typeof RallyResponseSchema>;
export type SubstitutionView = z.infer<typeof SubstitutionResponseSchema>;
export type TimeoutView = z.infer<typeof TimeoutResponseSchema>;
export type ChallengeView = z.infer<typeof ChallengeResponseSchema>;
export type EntryView = z.infer<typeof EntryResponseSchema>;

/**
 * The rally endpoint's response: entries land whenever the entry write
 * succeeds, and `setCompletionConfirmed` is only present when a set result
 * was attempted, stating whether that second write landed. Undefined means
 * no set result was attempted for this write.
 */
export type RecordRalliesResponse = {
  entries: EntryView[];
  setCompletionConfirmed?: boolean;
};

export type GameView = z.infer<typeof GameResponseSchema>;
export type GameTeamView = z.infer<typeof GameTeamResponseSchema>;
export type SetView = z.infer<typeof SetResponseSchema>;
export type GameSummaryView = z.infer<typeof GameSummaryResponseSchema>;

// For Forms and Tables
export const MatchInfoFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  teams: z.object({
    home: z.object({ name: z.string().optional() }),
    away: z.object({ name: z.string().optional() }),
  }),
  number: z.coerce.number().int().optional(),
  phase: z.enum(["0", "1", "2", "3", "4"]).optional(),
  division: z.enum(["0", "1", "2", "3"]).optional(),
  category: z.enum(["0", "1", "2", "3"]).optional(),
  scoring: z.object({
    setCount: z.string(),
    decidingSetPoints: z.coerce.number().int(),
  }),
  location: z
    .object({
      city: z.string().optional(),
      hall: z.string().optional(),
    })
    .optional(),
  time: z
    .object({
      date: z.date().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  weather: z
    .object({
      temperature: z.string().optional(),
    })
    .optional(),
});

export type TMatchInfoForm = z.infer<typeof MatchInfoFormSchema>;

export const SetOptionsFormSchema = z.object({
  serve: z.enum(["home", "away"]),
  time: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
});

export type SetOptionsFormValues = z.infer<typeof SetOptionsFormSchema>;

export type LineupListPlayer = {
  id: string;
  name: string;
  number: number;
  list: LineupList;
};

// For Redux
export type ReduxStatus = {
  scores: {
    home: number;
    away: number;
  };
  entryIndex: number;
  isServing: boolean;
  isSetInProgress: boolean;
  isSetPoint: boolean;
  panel: "home" | "away" | "substitutes";
  stats: DerivedSetStats;
};

type ReduxRallyDetail = Omit<RallyDetailView, "type" | "num"> & {
  type: RallyDetailView["type"] | null;
  num: RallyDetailView["num"] | null;
};

export type ReduxEntryDraft = Omit<RallyView, "win" | "home" | "away"> & {
  // Identity of the entry this draft becomes on submit. Empty/zero until
  // then: a create fills it in just before the optimistic update runs (a
  // fresh client-generated id, seq = the current entryIndex); an edit
  // inherits the original entry's id and seq from setEditingEntryStatus.
  id: string;
  seq: number;
  win: RallyView["win"] | null;
  home: ReduxRallyDetail;
  away: ReduxRallyDetail;
  substitution?: SubstitutionView;
  timeout?: TimeoutView;
  challenge?: ChallengeView;
};

export type ReduxGameState = {
  id: string;
  setIndex: number;
  mode: "general" | "editing";
  general: {
    status: ReduxStatus;
    entryDraft: ReduxEntryDraft;
  };
  editing: {
    status: ReduxStatus;
    entryDraft: ReduxEntryDraft;
  };
};

// For the pending-write queue: unconfirmed rally writes, kept in their own
// slice because their lifetime differs from the per-set draft above.
// The part of a failed write worth keeping. `detail` and `message` are
// human-facing and move with copy and translation, so they are deliberately
// absent: what survives is only what a later decision can act on.
export type WriteError = {
  code: AppErrorCode;
  reason: string;
  status: number;
};

export type PendingEntry = {
  entry: RallyView & EntryIdentity;
  gameId: string;
  setIndex: number;
  attempts: number;
  // Timestamp of the next scheduled attempt; null means the backoff budget
  // is exhausted or the error itself is not retryable.
  nextAttemptAt: number | null;
  // Why the last attempt failed, absent until one has. `nextAttemptAt: null`
  // conflates a spent backoff with a failure that can never succeed; this
  // keeps them apart for anything that has to decide between them later.
  lastError?: WriteError;
  // When that attempt failed. Kept beside the reason rather than inside it
  // because it is a fact about the entry's history, not about the failure's
  // identity, and it is still worth having when the reason could not be read.
  failedAt?: number;
};

// The queue as it exists on disk. `version` is what makes a shape change
// safe: a snapshot that does not match is discarded whole rather than
// migrated, because this data is minutes old in the normal case and a
// migration bug would corrupt exactly what the queue exists to protect.
export type PersistedPendingEntry = Pick<
  PendingEntry,
  "entry" | "gameId" | "setIndex" | "lastError" | "failedAt"
>;

export type PersistedQueue = {
  version: number;
  items: PersistedPendingEntry[];
};

// Storage is outside the app's control: anything running on this origin can
// write it, and whatever comes back goes into the queue and then onto the
// wire. Parsing is what makes "malformed stored data is treated as no stored
// data" true for a snapshot that is valid JSON but the wrong shape.
export const PersistedQueueSchema: z.ZodType<PersistedQueue> = z.object({
  version: z.number(),
  items: z.array(
    z.object({
      entry: RallyResponseSchema.merge(EntryIdentityResponseSchema),
      gameId: z.string(),
      setIndex: z.number(),
      lastError: z
        .object({
          // The union lives in the error model; re-listing it here would be a
          // second copy free to drift from it, and nothing branches on the
          // value -- only `status` decides anything.
          code: z.custom<AppErrorCode>((value) => typeof value === "string"),
          reason: z.string(),
          status: z.number(),
        })
        .optional(),
      failedAt: z.number().optional(),
    }),
  ),
});

export type PendingWritesState = {
  pending: PendingEntry[];
  // gameIds with a flush request currently on the wire. A game identity,
  // not a bare boolean, because a flush is scoped per game (see
  // usePendingWrites) and more than one game's flush can be in flight at
  // once -- e.g. one game's background retry firing while another is
  // manually retried.
  flushingGameIds: string[];
};

// For Other Components
export interface ITeamsStats {
  home: TeamStatsView;
  away: TeamStatsView;
}
