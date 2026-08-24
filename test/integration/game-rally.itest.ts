import { MoveType } from "@/entities/game";
import { GameReason } from "@/entities/errors";
import type { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createRally } from "@/app/api/games/[gameId]/sets/rallies/route";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { seedGame, type SeededGame } from "./support/seed";

const rally = {
  id: "entry-1",
  seq: 0,
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 0 },
  away: { score: 0, type: MoveType.ATTACK, num: 0 },
};

const options = { serve: "home", time: { start: "10:00", end: "" } };

describe("POST /api/games/:id/sets/rallies", () => {
  let seeded: SeededGame;

  beforeEach(async () => {
    useFakeAuth();
    // A null roster id is not what broke rally recording, but create-set walks
    // the whole squad and must not throw on one.
    seeded = await seedGame({ includeNullIdPlayer: true });
  });

  const repo = () => container.get<GameRepositoryImpl>(TYPES.GameRepository);

  it("creates the first set, persists it, then records a rally", async () => {
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });
    expect(created.status).toBe(201);

    // The set must actually be in the database, not just in the response.
    const afterSet = await repo().findById(seeded.gameId);
    expect(afterSet!.sets).toHaveLength(1);

    const res = await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0, ei: 0 },
      body: rally,
    });

    expect(res.status).toBe(200);
    const afterRally = await repo().findById(seeded.gameId);
    expect(afterRally!.sets[0]!.entries).toHaveLength(1);
    // The identity and sequence the client sent must round-trip unchanged.
    expect(afterRally!.sets[0]!.entries[0]).toMatchObject({
      id: rally.id,
      seq: rally.seq,
    });
  });

  it("returns 404 SET_NOT_FOUND for a set index that does not exist", async () => {
    const res = await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0, ei: 0 },
      body: rally,
    });
    expect(res.status).toBe(404);
    expect((res.json as { reason?: string }).reason).toBe(
      GameReason.SET_NOT_FOUND,
    );
  });
});
