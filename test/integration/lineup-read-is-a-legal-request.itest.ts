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

const asTheClientWouldSendItBack = (read: unknown) =>
  JSON.parse(JSON.stringify(read));

describe("the lineup a read hands back", () => {
  it("parses as a PATCH /api/teams/:id/lineups body", async () => {
    const repo = container.get<ITeamRepository>(TYPES.TeamRepository);
    const team = await repo.create({
      name: "Round Trip",
      lineups: [lineupFor(Array.from({ length: 6 }, oid))],
    } as Parameters<ITeamRepository["create"]>[0]);

    const read = await repo.findById(team.id);

    expect(() =>
      UpdateLineupsSchema.parse(asTheClientWouldSendItBack(read!.lineups)),
    ).not.toThrow();
  });

  it("parses as a POST /api/games/:id/sets body", async () => {
    useFakeAuth();
    const seeded = await seedGame();
    const options = { serve: "home" as const };
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    const repo = container.get<IGameRepository>(TYPES.GameRepository);
    const read = await repo.findById(seeded.gameId);
    const lineup = asTheClientWouldSendItBack(read!.sets[0]!.lineups.home);

    expect(() => CreateSetSchema.parse({ lineup, options })).not.toThrow();
  });
});
