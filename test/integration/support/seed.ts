import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { Game } from "@/entities/game";
import { Position } from "@/entities/team";
import type { Lineup } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { Types } from "mongoose";

export const oid = () => new Types.ObjectId().toString();

const emptyTeam = (
  name: string,
  players: Game["teams"]["home"]["players"],
) => ({
  id: oid(),
  name,
  players,
  staffs: [],
});

/** A lineup referencing the given player ids for the starting six. */
export const lineupFor = (playerIds: string[]): Lineup => ({
  options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
  starting: playerIds.slice(0, 6).map((id, i) => ({
    id,
    position: [
      Position.OH,
      Position.MB,
      Position.OP,
      Position.OH,
      Position.MB,
      Position.S,
    ][i],
  })),
  liberos: [],
  substitutes: [],
});

export interface SeededGame {
  gameId: string;
  teamId: string;
  playerIds: string[];
  lineup: Lineup;
}

/** Persist a minimal game (home team with 6 players, no sets) for reuse. */
export const seedGame = async ({
  includeNullIdPlayer = false,
  playerCount = 6,
}: {
  includeNullIdPlayer?: boolean;
  playerCount?: number;
} = {}): Promise<SeededGame> => {
  const repo = container.get<IGameRepository>(TYPES.GameRepository);
  const teamId = oid();
  const playerIds = Array.from({ length: playerCount }, oid);
  const players = playerIds.map((id, i) => ({
    id,
    name: `Player ${i + 1}`,
    number: i + 1,
  }));
  // Stands in for a squad member stored through the unvalidated create-game
  // body: no product path writes a null roster id, but the readers must not
  // throw on one.
  if (includeNullIdPlayer) {
    players.push({
      id: null as unknown as string,
      name: "Unlinked",
      number: 99,
    });
  }

  const game = await repo.create({
    win: false,
    teamId,
    info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
    teams: {
      home: emptyTeam("Home", players),
      away: emptyTeam("Away", []),
    },
    sets: [],
  } as Omit<Game, "id">);

  return { gameId: game.id, teamId, playerIds, lineup: lineupFor(playerIds) };
};
