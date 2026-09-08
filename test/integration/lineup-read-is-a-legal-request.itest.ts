import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { CreateSetSchema } from "@/interface/validations/game";
import { UpdateLineupsSchema } from "@/interface/validations/team";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { lineupFor, oid, seedGame } from "./support/seed";

/**
 * The lineup editor and the recorder both send back a lineup they were handed
 * by a read. Under `.strict()` that only works while every read returns a
 * value the request schema accepts — a Mongoose subdocument `_id` riding along
 * on the read is enough to make the next save fail.
 */
describe("a lineup read straight back into its own request schema", () => {
  it("survives the team read path", async () => {
    const repo = container.get<ITeamRepository>(TYPES.TeamRepository);
    const playerIds = Array.from({ length: 6 }, oid);
    const team = await repo.create({
      name: "Round Trip",
      lineups: [lineupFor(playerIds)],
    } as Parameters<ITeamRepository["create"]>[0]);

    const read = await repo.findById(team.id);

    expect(() =>
      UpdateLineupsSchema.parse(JSON.parse(JSON.stringify(read!.lineups))),
    ).not.toThrow();
  });

  it("survives the game read path", async () => {
    useFakeAuth();
    const seeded = await seedGame();
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options: { serve: "home" } },
    });

    const repo = container.get<IGameRepository>(TYPES.GameRepository);
    const read = await repo.findById(seeded.gameId);
    const lineup = JSON.parse(JSON.stringify(read!.sets[0]!.lineups.home));

    expect(() =>
      CreateSetSchema.parse({ lineup, options: { serve: "home" } }),
    ).not.toThrow();
  });
});
