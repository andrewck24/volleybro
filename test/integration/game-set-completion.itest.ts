import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { MoveType } from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createRally } from "@/app/api/games/[gameId]/sets/rallies/route";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { seedGame, type SeededGame } from "./support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };

const decidingRally = (
  homeScore: number,
  awayScore: number,
  homeWinsPoint: boolean,
) => ({
  win: homeWinsPoint,
  home: { score: homeScore, type: MoveType.ATTACK, num: 0 },
  away: { score: awayScore, type: MoveType.ATTACK, num: 0 },
});

describe("set and match completion", () => {
  let seeded: SeededGame;
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame();
  });

  const playSet = async (
    setIndex: number,
    homeScore: number,
    awayScore: number,
  ) => {
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: setIndex },
      body: { lineup: seeded.lineup, options },
    });
    expect(created.status).toBe(201);

    const res = await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: setIndex, ei: 0 },
      body: decidingRally(homeScore, awayScore, homeScore > awayScore),
    });
    expect(res.status).toBe(200);
  };

  it("writes each set's win and decides the match once a side has a majority", async () => {
    // Set 0 (25 points): home wins.
    await playSet(0, 25, 20);
    // Set 1 (25 points): away wins, so neither side yet has a majority of 3.
    await playSet(1, 20, 25);
    // Set 2 is the deciding set, played to decidingSetPoints (15): home wins it.
    await playSet(2, 15, 10);

    const game = await repo().findById(seeded.gameId);
    expect(game!.sets[0]!.win).toBe(true);
    expect(game!.sets[1]!.win).toBe(false);
    expect(game!.sets[2]!.win).toBe(true);
    expect(game!.win).toBe(true);

    const summaries = await repo().findGameSummaries(seeded.teamId);
    const summary = summaries.data.find((s) => s.id === seeded.gameId);
    expect(summary).toMatchObject({
      win: true,
      teams: {
        home: { sets: 2 },
        away: { sets: 1 },
      },
    });
  });

  it("leaves a set undecided until the rally that ends it", async () => {
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });
    expect(created.status).toBe(201);

    await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0, ei: 0 },
      body: decidingRally(24, 20, true),
    });
    expect((await repo().findById(seeded.gameId))!.sets[0]!.win).toBeNull();

    await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0, ei: 1 },
      body: decidingRally(25, 20, true),
    });
    expect((await repo().findById(seeded.gameId))!.sets[0]!.win).toBe(true);
  });

  it("leaves the match undecided while sets are split without a majority", async () => {
    await playSet(0, 25, 20);
    await playSet(1, 20, 25);

    const game = await repo().findById(seeded.gameId);
    expect(game!.sets[0]!.win).toBe(true);
    expect(game!.sets[1]!.win).toBe(false);
    expect(game!.win).toBeNull();
  });
});
