import { PlayerRole, PlayerStatus } from "@/entities/player";
import { Position } from "@/entities/team";
import { z } from "zod";

const LineupPlayerResponseSchema = z.object({
  id: z.string().nullable(),
  position: z.nativeEnum(Position).optional(),
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

export const LineupResponseSchema = z.object({
  options: z.object({
    liberoReplaceMode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    liberoReplacePosition: z.enum([
      Position.NONE,
      Position.OH,
      Position.MB,
      Position.OP,
    ]),
  }),
  starting: z.array(LineupPlayerResponseSchema),
  liberos: z.array(LineupPlayerResponseSchema),
  substitutes: z.array(LineupPlayerResponseSchema),
});

export const PlayerResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.number().optional(),
  position: z.nativeEnum(Position).optional(),
  status: z.nativeEnum(PlayerStatus),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  role: z.nativeEnum(PlayerRole).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const TeamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().optional(),
  lineups: z.array(LineupResponseSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type PlayerView = z.infer<typeof PlayerResponseSchema>;
export type TeamView = z.infer<typeof TeamResponseSchema>;
export type LineupView = z.infer<typeof LineupResponseSchema>;
export type LineupList = "starting" | "liberos" | "substitutes";

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
    list: LineupList | "";
    zone: number | null;
  };
};

export type ReduxLineupState = {
  lineups: LineupView[];
  status: ReduxLineupStatus;
};
