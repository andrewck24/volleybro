import type { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import {
  POST as createSet,
  PUT as updateSet,
} from "@/app/api/games/[gameId]/sets/route";
import { Types } from "mongoose";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { seedGame, type SeededGame } from "./support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };
const nonRosterId = () => new Types.ObjectId().toString();

const withGhostStarter = (seeded: SeededGame) => {
  const lineup = structuredClone(seeded.lineup);
  lineup.starting[0]!.id = nonRosterId();
  return lineup;
};

describe("lineup roster validation on /api/games/:id/sets", () => {
  let seeded: SeededGame;

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame();
  });

  const repo = () => container.get<GameRepositoryImpl>(TYPES.GameRepository);

  it("POST rejects a lineup referencing a non-roster player", async () => {
    const res = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: withGhostStarter(seeded), options },
    });

    expect(res.status).toBe(400);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]).toBeUndefined();
  });

  it("POST persists a valid roster-derived lineup", async () => {
    const res = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    expect(res.status).toBe(201);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]!.lineups.home.starting[0]!.id).toBe(
      seeded.playerIds[0],
    );
  });

  it("PUT rejects a lineup referencing a non-roster player", async () => {
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    const res = await callRoute(updateSet, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: { lineup: withGhostStarter(seeded), options },
    });

    expect(res.status).toBe(400);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]!.lineups.home.starting[0]!.id).toBe(
      seeded.playerIds[0],
    );
  });

  it("PUT persists a valid roster-derived lineup", async () => {
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    const res = await callRoute(updateSet, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    expect(res.status).toBe(200);
  });
});
