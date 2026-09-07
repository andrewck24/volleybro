import { MoveType } from "@/entities/game";
import { CommonReason } from "@/entities/errors";
import type { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { PUT as recordRallies } from "@/app/api/games/[gameId]/sets/rallies/route";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { seedGame, type SeededGame } from "./support/seed";

const rally = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  seq: 0,
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 4 },
  away: { score: 0, type: MoveType.DEFENSE, num: 7 },
  ...overrides,
});

const options = { serve: "home", time: { start: "10:00", end: "" } };

// The entity validator has its own unit tests. This one exists to show that
// something on the request path actually calls it: nothing in a unit test can
// tell a guarded write path from an unguarded one.
describe("PUT /api/games/:id/sets/rallies rejects a malformed rally", () => {
  let seeded: SeededGame;
  const repo = () => container.get<GameRepositoryImpl>(TYPES.GameRepository);

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame();
    expect(
      (
        await callRoute(createSet, {
          gameId: seeded.gameId,
          method: "POST",
          query: { si: 0 },
          body: { lineup: seeded.lineup, options },
        })
      ).status,
    ).toBe(201);
  });

  it.each([
    ["names no move type", { home: { score: 1, num: 4 } }],
    [
      "names a move type outside the enum",
      { home: { score: 1, type: 99, num: 4 } },
    ],
    ["records no win", { win: undefined }],
  ])(
    "answers 400 and stores nothing when the rally %s",
    async (_name, overrides) => {
      const res = await callRoute(recordRallies, {
        gameId: seeded.gameId,
        method: "PUT",
        query: { si: 0 },
        body: [rally(overrides)],
      });

      expect(res.status).toBe(400);
      expect((res.json as { reason?: string }).reason).toBe(
        CommonReason.INVALID_INPUT,
      );

      const after = await repo().findById(seeded.gameId);
      expect(after!.sets[0]!.entries).toHaveLength(0);
    },
  );

  it("still records a rally whose fields are all in range", async () => {
    const res = await callRoute(recordRallies, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: [rally()],
    });

    expect(res.status).toBe(200);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]!.entries).toHaveLength(1);
  });
});
