import mongoose from "mongoose";

import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IRecordRalliesUseCase } from "@/applications/usecases/game/record-rallies.usecase";
import { MoveType } from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { seedGame } from "../support/seed";

// completeSet writes with findAndModify and the entry write with bulkWrite, so
// failing that one command fails only the set result.
const failFindAndModify = (mode: "alwaysOn" | "off") =>
  mongoose.connection.db!.admin().command({
    configureFailPoint: "failCommand",
    mode,
    data: { failCommands: ["findAndModify"], errorCode: 2 },
  });

describe("a set-result write that fails after the deciding rally is stored", () => {
  beforeEach(() => useFakeAuth());

  it("keeps the rally's entry and reports the set result unconfirmed", async () => {
    const seeded = await seedGame();
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: {
        lineup: seeded.lineup,
        options: { serve: "home", time: { start: "10:00", end: "" } },
      },
    });
    expect(created.status).toBe(201);

    await failFindAndModify("alwaysOn");
    let output;
    try {
      output = await container
        .get<IRecordRalliesUseCase>(TYPES.RecordRalliesUseCase)
        .execute({
          params: { gameId: seeded.gameId, setIndex: 0 },
          data: [
            {
              id: "deciding",
              seq: 0,
              win: true,
              home: { score: 25, type: MoveType.ATTACK, num: 0 },
              away: { score: 20, type: MoveType.ATTACK, num: 0 },
            },
          ] as never,
        });
    } finally {
      await failFindAndModify("off");
    }

    expect(output.setCompletionConfirmed).toBe(false);
    const game = await container
      .get<IGameRepository>(TYPES.GameRepository)
      .findById(seeded.gameId);
    expect(game!.sets[0]!.entries.map((e) => e.id)).toEqual(["deciding"]);
    expect(game!.sets[0]!.win).toBeNull();
  });
});
