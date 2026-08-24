import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { EntryType, MoveType, Side } from "@/entities/game";
import { Position } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createRally } from "@/app/api/games/[gameId]/sets/rallies/route";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { POST as createSubstitution } from "@/app/api/games/[gameId]/sets/substitutions/route";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { lineupFor, seedGame, type SeededGame } from "./support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };

const rally = {
  id: "entry-rally-1",
  seq: 0,
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 0 },
  away: { score: 0, type: MoveType.ATTACK, num: 0 },
};

describe("POST /api/games/:id/sets/substitutions", () => {
  let seeded: SeededGame;
  let benchId: string;
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame({ playerCount: 7 });
    benchId = seeded.playerIds[6]!;
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: {
        lineup: {
          ...lineupFor(seeded.playerIds),
          substitutes: [{ id: benchId, position: Position.OH }],
        },
        options,
      },
    });
    expect(created.status).toBe(201);
  });

  it("appends the entry and swaps the lineup in the same write", async () => {
    // A rally first, so the substitution has to land after it rather than
    // overwrite the set.
    await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0, ei: 0 },
      body: rally,
    });

    const res = await callRoute(createSubstitution, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0, ei: 1 },
      body: {
        id: "entry-sub-1",
        seq: 1,
        team: Side.HOME,
        players: { in: benchId, out: seeded.playerIds[0] },
      },
    });

    expect(res.status).toBe(200);

    const set = (await repo().findById(seeded.gameId))!.sets[0]!;
    expect(set.entries).toHaveLength(2);
    expect(set.entries[0]).toMatchObject({ type: EntryType.RALLY });
    expect(set.entries[1]).toMatchObject({
      type: EntryType.SUBSTITUTION,
      players: { in: benchId, out: seeded.playerIds[0] },
    });
    expect(set.lineups.home.starting[0]).toMatchObject({
      id: benchId,
      sub: { id: seeded.playerIds[0], entryIndex: { in: 1 } },
    });
    expect(set.lineups.home.substitutes[0]).toMatchObject({
      id: seeded.playerIds[0],
      sub: { id: benchId, entryIndex: { in: 1 } },
    });
  });
});
