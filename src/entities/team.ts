import { TeamStats } from "@/entities/game";

export enum Position {
  NONE = "",
  OH = "OH",
  MB = "MB",
  OP = "OP",
  S = "S",
  L = "L",
}

export type LineupPlayer = {
  id: string | null;
  position?: Position;
  sub?: { id: string | null; entryIndex: { in?: number; out?: number } };
};

export type Lineup = {
  options: {
    liberoReplaceMode: 0 | 1 | 2;
    liberoReplacePosition:
      | Position.NONE
      | Position.OH
      | Position.MB
      | Position.OP;
  };
  starting: LineupPlayer[];
  liberos: LineupPlayer[];
  substitutes: LineupPlayer[];
};

export type Team = {
  id: string;
  name: string;
  nickname?: string;
  lineups: Lineup[];
  stats?: TeamStats[];
  createdAt?: Date;
  updatedAt?: Date;
};
