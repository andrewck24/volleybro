import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { NotFoundError } from "@/entities/errors";
import {
  EntryType,
  MoveType,
  Side,
  type Game,
  type Set,
} from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { oid, seedGame } from "../support/seed";

const games = () => container.get<IGameRepository>(TYPES.GameRepository);

describe("game reads and writes", () => {
  it("finds no game for an id nobody holds", async () => {
    expect(await games().findById(oid())).toBeNull();
  });

  it("reads an id that is not an ObjectId as a game that does not exist", async () => {
    await expect(games().findById("not-an-id")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("refuses to update a game that does not exist", async () => {
    await expect(games().update(oid(), { win: true })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("stores the sets an update writes with every player id readable as a string", async () => {
    const { gameId, playerIds } = await seedGame();
    const [scorer, incoming, outgoing] = playerIds;
    const set = {
      win: null,
      lineups: {
        home: {
          options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
          starting: [{ id: scorer, position: "OH" }, { id: null }],
          liberos: [],
          substitutes: [],
        },
        away: {
          options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
          starting: [],
          liberos: [],
          substitutes: [],
        },
      },
      options: { serve: Side.HOME, time: { start: "10:00", end: "" } },
      entries: [
        {
          type: EntryType.RALLY,
          id: "rally-1",
          seq: 0,
          win: true,
          home: {
            score: 1,
            type: MoveType.ATTACK,
            num: 1,
            player: { id: scorer, zone: 4 },
          },
          away: { score: 0, type: MoveType.ATTACK, num: 1 },
        },
        {
          type: EntryType.SUBSTITUTION,
          id: "sub-1",
          seq: 1,
          team: Side.HOME,
          players: { in: incoming, out: outgoing },
        },
      ],
    } as unknown as Set;

    const updated = await games().update(gameId, { sets: [set] });
    const stored = (await games().findById(gameId))!;

    for (const game of [updated, stored]) {
      const [written] = game.sets;
      expect(written!.lineups.home.starting.map((slot) => slot.id)).toEqual([
        scorer,
        null,
      ]);
      const [rally, substitution] = written!.entries as unknown as [
        { home: { player: { id: string } } },
        { players: { in: string; out: string } },
      ];
      expect(rally.home.player.id).toBe(scorer);
      expect(substitution.players).toEqual({ in: incoming, out: outgoing });
    }
  });

  it("leaves what an update does not name as it was", async () => {
    const { gameId, teamId } = await seedGame();

    const updated: Game = await games().update(gameId, { win: true });

    expect(updated).toMatchObject({ id: gameId, teamId, win: true });
    expect(updated.teams.home.name).toBe("Home");
  });
});
