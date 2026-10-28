import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IRecordEntriesUseCase } from "@/applications/usecases/game/record-entries.usecase";
import { EntryType, MoveType } from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { withFailPoint } from "../support/failpoint";
import { callRoute } from "../support/request";
import { seedGame } from "../support/seed";

// completeSet writes with findAndModify and the entry write with bulkWrite, so
// failing that one command fails only the set result.
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

    const output = await withFailPoint(
      "alwaysOn",
      { failCommands: ["findAndModify"], errorCode: 2 },
      () =>
        container
          .get<IRecordEntriesUseCase>(TYPES.RecordEntriesUseCase)
          .execute({
            params: { gameId: seeded.gameId, setIndex: 0 },
            data: [
              {
                type: EntryType.RALLY,
                id: "deciding",
                seq: 0,
                at: new Date(),
                win: true,
                home: { score: 25, type: MoveType.ATTACK, num: 0 },
                away: { score: 20, type: MoveType.ATTACK, num: 0 },
              },
            ] as never,
          }),
    );

    expect(output.setCompletionConfirmed).toBe(false);
    const game = await container
      .get<IGameRepository>(TYPES.GameRepository)
      .findById(seeded.gameId);
    expect(game!.sets[0]!.entries.map((e) => e.id)).toEqual(["deciding"]);
    expect(game!.sets[0]!.win).toBeNull();
  });
});
