import { Position } from "@/entities/team";
import type { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import {
  POST as createSet,
  PUT as updateSet,
} from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { seedGame, type SeededGame } from "./support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };

describe("PUT /api/games/:id/sets", () => {
  let seeded: SeededGame;

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame();
  });

  const repo = () => container.get<GameRepositoryImpl>(TYPES.GameRepository);

  it("persists an edited lineup, not just the options", async () => {
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    // Move the setter (index 5) into the outside-hitter position.
    const editedLineup = structuredClone(seeded.lineup);
    editedLineup.starting[5].position = Position.OH;

    const res = await callRoute(updateSet, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: { lineup: editedLineup, options },
    });
    expect(res.status).toBe(200);

    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0].lineups.home.starting[5].position).toBe(Position.OH);
  });
});
