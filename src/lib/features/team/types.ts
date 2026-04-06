import { type Lineup, Position } from "@/entities/team";
import { z } from "zod";

// For Forms
export const LiberoReplaceFormSchema = z.object({
  mode: z.enum(["0", "1", "2"]),
  position: z.enum([Position.NONE, Position.MB, Position.OP, Position.OH]),
});

export type LiberoReplaceFormValues = z.infer<typeof LiberoReplaceFormSchema>;

// For Redux
export enum LineupOptionMode {
  NONE = "",
  PLAYERINFO = "playerInfo",
  POSITIONS = "positions",
  SUBSTITUTES = "substitutes",
}

export type ReduxLineupStatus = {
  edited: boolean;
  lineupIndex: number;
  optionMode: LineupOptionMode;
  editingMember: {
    id: string | null;
    list: "starting" | "liberos" | "substitutes" | "";
    zone: number | null;
  };
};

export type ReduxLineupState = {
  lineups: Lineup[];
  status: ReduxLineupStatus;
};
