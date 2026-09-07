import type { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import mongoose, { Types } from "mongoose";
import { useFakeAuth } from "./support/auth";
import { seedGame } from "./support/seed";

describe("reading a game document that still carries legacy weather data", () => {
  beforeEach(() => useFakeAuth());

  it("reads back successfully with the rest of the game intact", async () => {
    const seeded = await seedGame();

    // Simulate a document written before Match.weather was dropped from the
    // schema: write it straight through the driver, bypassing mongoose.
    await mongoose.connection
      .collection("games")
      .updateOne(
        { _id: new Types.ObjectId(seeded.gameId) },
        { $set: { "info.weather": { temperature: "" } } },
      );

    const repo = container.get<GameRepositoryImpl>(TYPES.GameRepository);
    const game = await repo.findById(seeded.gameId);

    expect(game).not.toBeNull();
    expect((game!.teams.home.players ?? []).map((p) => p.id)).toEqual(
      seeded.playerIds,
    );
    expect(game!.sets).toEqual([]);

    const raw = await mongoose.connection
      .collection("games")
      .findOne({ _id: new Types.ObjectId(seeded.gameId) });
    expect((raw!.info as unknown as { weather?: unknown }).weather).toEqual({
      temperature: "",
    });
  });
});
