import { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import mongoose from "mongoose";
import { useFakeAuth } from "./support/auth";
import { seedGame } from "./support/seed";

describe("integration harness smoke", () => {
  beforeEach(() => useFakeAuth());

  it("connects to a real in-memory mongo", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  it("resolves the real (unmocked) game repository from the container", () => {
    const repo = container.get(TYPES.GameRepository);
    expect(repo).toBeInstanceOf(GameRepositoryImpl);
  });

  it("persists and reads back a seeded game", async () => {
    const { gameId, playerIds } = await seedGame();
    const repo = container.get<GameRepositoryImpl>(TYPES.GameRepository);
    const game = await repo.findById(gameId);

    expect(game).not.toBeNull();
    expect(game!.teams.home.players.map((p) => p.id)).toEqual(playerIds);
    expect(game!.sets).toEqual([]);
  });

  it("clears collections between tests", async () => {
    const count = await mongoose.connection
      .collection("games")
      .countDocuments();
    expect(count).toBe(0);
  });
});
