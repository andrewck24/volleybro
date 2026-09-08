import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { MoveType } from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createGame } from "@/app/api/games/route";
import {
  POST as createSet,
  PUT as updateSet,
} from "@/app/api/games/[gameId]/sets/route";
import { PUT as recordRallies } from "@/app/api/games/[gameId]/sets/rallies/route";
import { POST as createSubstitution } from "@/app/api/games/[gameId]/sets/substitutions/route";
import { NextRequest } from "next/server";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { oid, seedGame, type SeededGame } from "./support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };

// Each of the five game write routes now parses its body at the boundary.
// These prove a malformed body is rejected before anything reaches a
// database write — the point of `request-schema-boundary` S04.
describe("game write routes reject a malformed body without persisting", () => {
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);

  beforeEach(() => useFakeAuth());

  it("POST /api/games rejects an undeclared field and creates nothing", async () => {
    const teamId = oid();
    const res = await createGame(
      new NextRequest(`http://localhost/api/games?ti=${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          info: { title: "Game 1" },
          teams: {},
        }),
      }),
    );

    expect(res.status).toBe(400);
    const { data } = await repo().findGameSummaries(teamId);
    expect(data).toHaveLength(0);
  });

  it("POST /api/games/:id/sets rejects an undeclared field and creates no set", async () => {
    const seeded = await seedGame();

    const res = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options, extra: true },
    });

    expect(res.status).toBe(400);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]).toBeUndefined();
  });

  it("PUT /api/games/:id/sets rejects an undeclared field without overwriting the set", async () => {
    const seeded = await seedGame();
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
      body: { options, extra: true },
    });

    expect(res.status).toBe(400);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]!.options.serve).toBe("home");
  });

  it("PUT /api/games/:id/sets/rallies rejects an undeclared field nested in player and stores nothing", async () => {
    const seeded = await seedGame();
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    // Neither validateRallyEntry (still in place until S05) nor Mongoose
    // casting rejects an extra field — only the schema's nested `.strict()`
    // on `player` does.
    const res = await callRoute(recordRallies, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: [
        {
          id: "entry-1",
          seq: 0,
          win: true,
          home: {
            score: 1,
            type: MoveType.ATTACK,
            num: 4,
            player: { id: seeded.playerIds[0], zone: 4, list: "starting" },
          },
          away: { score: 0, type: MoveType.DEFENSE, num: 7 },
        },
      ],
    });

    expect(res.status).toBe(400);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]!.entries).toHaveLength(0);
  });

  it("POST /api/games/:id/sets/substitutions rejects an undeclared field and swaps nothing", async () => {
    const seeded: SeededGame = await seedGame({ playerCount: 7 });
    const benchId = seeded.playerIds[6]!;
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: {
        lineup: {
          ...seeded.lineup,
          substitutes: [{ id: benchId }],
        },
        options,
      },
    });

    const res = await callRoute(createSubstitution, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0, ei: 0 },
      body: {
        id: "entry-sub-1",
        seq: 0,
        team: 1,
        players: { in: benchId, out: seeded.playerIds[0] },
        extra: true,
      },
    });

    expect(res.status).toBe(400);
    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]!.entries).toHaveLength(0);
    expect(after!.sets[0]!.lineups.home.starting[0]!.id).toBe(
      seeded.playerIds[0],
    );
  });
});
