import {
  EntryType,
  MatchCategory,
  MatchDivision,
  MatchPhase,
  MoveType,
  Side,
} from "@/entities/game";
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

const TeamStatsResponseSchema = PlayerStatsResponseSchema.extend({
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
  stats: z.array(PlayerStatsResponseSchema),
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
  stats: z.array(TeamStatsResponseSchema),
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

export const EntryResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(EntryType.RALLY) }).merge(RallyResponseSchema),
  z
    .object({ type: z.literal(EntryType.SUBSTITUTION) })
    .merge(SubstitutionResponseSchema),
  z.object({ type: z.literal(EntryType.TIMEOUT) }).merge(TimeoutResponseSchema),
  z
    .object({ type: z.literal(EntryType.CHALLENGE) })
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
  win: z.boolean(),
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
  inProgress: boolean;
  isSetPoint: boolean;
  panel: "home" | "away" | "substitutes";
};

type ReduxRallyDetail = Omit<RallyDetailView, "type" | "num"> & {
  type: RallyDetailView["type"] | null;
  num: RallyDetailView["num"] | null;
};

export type ReduxEntryDraft = Omit<RallyView, "win" | "home" | "away"> & {
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

// For Other Components
export interface ITeamsStats {
  home: TeamStatsView;
  away: TeamStatsView;
}
