import type { Lineup, LineupPlayer, Team } from "@/entities/team";
import { Types } from "mongoose";

type RawLineupPlayer = {
  playerId?: Types.ObjectId | null;
  position?: string;
  sub?: {
    playerId?: Types.ObjectId | null;
    entryIndex?: { in?: number; out?: number };
  };
};
type RawLineup = {
  options: Lineup["options"];
  starting: RawLineupPlayer[];
  liberos: RawLineupPlayer[];
  substitutes: RawLineupPlayer[];
};
export type RawTeam = {
  _id: Types.ObjectId;
  lineups?: RawLineup[];
} & Omit<Team, "id" | "lineups">;

function mapLineupPlayer(p: RawLineupPlayer): LineupPlayer {
  return {
    id: p.playerId?.toString() ?? null,
    position: p.position as LineupPlayer["position"],
    sub: p.sub
      ? {
          id: p.sub.playerId?.toString() ?? null,
          entryIndex: p.sub.entryIndex ?? {},
        }
      : undefined,
  };
}

function toLineupPlayerDoc(p: LineupPlayer) {
  return {
    playerId: p.id ? new Types.ObjectId(p.id) : null,
    position: p.position,
    sub: p.sub
      ? {
          playerId: p.sub.id ? new Types.ObjectId(p.sub.id) : null,
          entryIndex: p.sub.entryIndex,
        }
      : undefined,
  };
}

export function toLineupDoc(lineup: Lineup) {
  return {
    options: lineup.options,
    starting: lineup.starting.map(toLineupPlayerDoc),
    liberos: lineup.liberos.map(toLineupPlayerDoc),
    substitutes: lineup.substitutes.map(toLineupPlayerDoc),
  };
}

export function toTeam(obj: RawTeam): Team {
  return {
    ...obj,
    id: obj._id.toString(),
    lineups:
      obj.lineups?.map((lineup) => ({
        // `lineupSchema` is the one sub-schema without `{ _id: false }`.
        options: lineup.options,
        starting: lineup.starting.map(mapLineupPlayer),
        liberos: lineup.liberos.map(mapLineupPlayer),
        substitutes: lineup.substitutes.map(mapLineupPlayer),
      })) ?? [],
  };
}
