import { TeamStats } from "@/entities/record";

export enum Position {
  NONE = "",
  OH = "OH",
  MB = "MB",
  OP = "OP",
  S = "S",
  L = "L",
}

export type LineupPlayer = {
  _id: string;
  position?: Position;
  sub?: { _id: string; rallyIndex: { in?: number; out?: number } };
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

export enum Role {
  MEMBER,
  OWNER,
  ADMIN,
}

export type Member = {
  _id: string;
  email?: string;
  role: Role;
  user_id?: string;
};

export type Team = {
  _id: string;
  name: string;
  nickname?: string;
  members: Member[];
  lineups: Lineup[];
  stats?: TeamStats[];
  createdAt?: Date;
  updatedAt?: Date;
};
