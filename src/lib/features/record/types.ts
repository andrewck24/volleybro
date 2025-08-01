import type {
  Challenge,
  Rally,
  Substitution,
  TeamStats,
  Timeout,
} from "@/entities/record";
import { z } from "zod";

// For Forms and Tables
export const MatchInfoFormSchema = z.object({
  _id: z.string().optional(),
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
    decidingSetPoints: z.coerce.number(),
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
  _id: string;
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

export type ReduxRecording = Rally & {
  substitution?: Substitution;
  timeout?: Timeout;
  challenge?: Challenge;
};

export type ReduxRecordState = {
  _id: string;
  setIndex: number;
  mode: "general" | "editing";
  general: {
    status: ReduxStatus;
    recording: ReduxRecording;
  };
  editing: {
    status: ReduxStatus;
    recording: ReduxRecording;
  };
};

// For Other Components
export interface ITeamsStats {
  home: TeamStats;
  away: TeamStats;
}
