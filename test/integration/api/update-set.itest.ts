import { Side } from "@/entities/game";
import { Position, type Lineup } from "@/entities/team";
import { POST as createSubstitution } from "@/app/api/games/[gameId]/sets/substitutions/route";
import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import {
  POST as createSet,
  PUT as updateSet,
} from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { lineupFor, seedGame, type SeededGame } from "../support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };

describe("PUT /api/games/:id/sets", () => {
  let seeded: SeededGame;

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame();
  });

  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);

  it("persists an edited lineup, not just the options", async () => {
    await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });

    // Move the setter (index 5) into the outside-hitter position.
    const editedLineup = structuredClone(seeded.lineup);
    editedLineup.starting[5]!.position = Position.OH;

    const res = await callRoute(updateSet, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: { lineup: editedLineup, options },
    });
    expect(res.status).toBe(200);

    const after = await repo().findById(seeded.gameId);
    expect(after!.sets[0]!.startingLineups.home.starting[5]!.position).toBe(
      Position.OH,
    );
    expect(after!.sets[0]!.lineups.home.starting[5]!.position).toBe(
      Position.OH,
    );
  });

  describe("once a substitution is recorded", () => {
    let benchId: string;
    let withBench: Lineup;

    beforeEach(async () => {
      seeded = await seedGame({ playerCount: 7 });
      benchId = seeded.playerIds[6]!;
      withBench = {
        ...lineupFor(seeded.playerIds),
        substitutes: [{ id: benchId, position: Position.OH }],
      };
      await callRoute(createSet, {
        gameId: seeded.gameId,
        method: "POST",
        query: { si: 0 },
        body: { lineup: withBench, options },
      });
      const sub = await callRoute(createSubstitution, {
        gameId: seeded.gameId,
        method: "POST",
        query: { si: 0 },
        body: {
          id: "entry-sub-1",
          seq: 0,
          at: "2026-03-01T10:01:00.000Z",
          team: Side.HOME,
          players: { in: benchId, out: seeded.playerIds[0] },
        },
      });
      expect(sub.status).toBe(200);
    });

    it("recomputes the current lineup from an edited starting lineup", async () => {
      const edited = structuredClone(withBench);
      edited.starting[5]!.position = Position.OP;

      const res = await callRoute(updateSet, {
        gameId: seeded.gameId,
        method: "PUT",
        query: { si: 0 },
        body: { lineup: edited, options },
      });

      expect(res.status).toBe(200);
      const [set] = (await repo().findById(seeded.gameId))!.sets;
      expect(set!.lineups.home.starting[0]).toMatchObject({
        id: benchId,
        sub: { id: seeded.playerIds[0], entryIndex: { in: 0 } },
      });
      expect(set!.lineups.home.starting[5]!.position).toBe(Position.OP);
    });

    it("rejects a starting lineup that invalidates a substitution and changes nothing", async () => {
      const edited = structuredClone(withBench);
      edited.starting[0] = { id: seeded.playerIds[1]!, position: Position.OH };
      edited.starting[1] = { id: seeded.playerIds[0]!, position: Position.MB };
      edited.starting[2] = { id: benchId, position: Position.OP };
      edited.substitutes = [
        { id: seeded.playerIds[2]!, position: Position.OP },
      ];
      const before = (await repo().findById(seeded.gameId))!.sets[0]!;

      const res = await callRoute(updateSet, {
        gameId: seeded.gameId,
        method: "PUT",
        query: { si: 0 },
        body: { lineup: edited, options },
      });

      expect(res.status).toBe(400);
      const after = (await repo().findById(seeded.gameId))!.sets[0]!;
      expect(after.startingLineups).toEqual(before.startingLineups);
      expect(after.lineups).toEqual(before.lineups);
    });
  });
});
