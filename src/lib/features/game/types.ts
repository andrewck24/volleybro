import type {
  Challenge,
  Rally,
  RallyDetail,
  Substitution,
  TeamStats,
  Timeout,
} from "@/entities/game";
import { z } from "zod";

// For Forms and Tables
export const MatchInfoFormSchema = z.object({
  id: z.string().optional(),
  // For MatchInfoForm
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

export type TableRosterPlayer = {
  id: string;
  name: string;
  number: number;
  list: string;
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

type ReduxRallyDetail = Omit<RallyDetail, "type" | "num"> & {
  type: RallyDetail["type"] | null;
  num: RallyDetail["num"] | null;
};

export type ReduxEntryDraft = Omit<Rally, "win" | "home" | "away"> & {
  win: Rally["win"] | null;
  home: ReduxRallyDetail;
  away: ReduxRallyDetail;
  substitution?: Substitution;
  timeout?: Timeout;
  challenge?: Challenge;
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
  home: TeamStats;
  away: TeamStats;
}
