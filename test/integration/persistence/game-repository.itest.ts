import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { GameReason, NotFoundError, ValidationError } from "@/entities/errors";
import { MoveType, Side, type Game, type Set } from "@/entities/game";
import {
  createRecordedRally,
  createRecordedSubstitution,
} from "@test/support/fixtures/entries";
import mongoose from "mongoose";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { Position, type Lineup } from "@/entities/team";
import { lineupFor, oid, seedGame } from "../support/seed";

const startedSet = (lineup: Lineup) => {
  const lineups = { home: lineup, away: { ...lineup, starting: [] } };
  return {
    win: null,
    startingLineups: lineups,
    lineups,
    options: { serve: Side.HOME, time: { start: "10:00", end: "" } },
    entries: [],
  } as unknown as Set;
};

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

  it("reads every player id the stored sets hold back as a string", async () => {
    const { gameId, playerIds } = await seedGame({ playerCount: 8 });
    const [scorer, , outgoing] = playerIds as [string, string, string];
    const incoming = playerIds[6]!;
    const set = startedSet({
      ...lineupFor(playerIds),
      substitutes: [{ id: incoming, position: Position.OH }],
    });
    const at = new Date("2026-03-01T10:00:00.000Z");

    const added = await games().addSet({ gameId, setIndex: 0 }, set);
    const entries = await games().upsertEntries(
      { gameId, setIndex: 0 },
      [
        createRecordedRally({
          id: "rally-1",
          seq: 0,
          home: {
            score: 1,
            type: MoveType.ATTACK,
            num: 1,
            player: { id: scorer, zone: 4 },
          },
          away: { score: 0, type: MoveType.ATTACK, num: 1 },
        }),
        createRecordedSubstitution({
          id: "sub-1",
          seq: 1,
          team: Side.HOME,
          players: { in: incoming, out: outgoing },
        }),
      ].map((entry) => ({ entry, at })),
      oid(),
    );
    const stored = (await games().findById(gameId))!;

    expect(added.sets[0]!.lineups.home.starting.map((s) => s.id)).toEqual(
      playerIds.slice(0, 6),
    );
    for (const written of [entries, stored.sets[0]!.entries]) {
      const [rally, substitution] = written as unknown as [
        { home: { player: { id: string; zone: number } } },
        { players: { in: string; out: string } },
      ];
      expect(rally.home.player).toEqual({ id: scorer, zone: 4 });
      expect(substitution.players).toEqual({ in: incoming, out: outgoing });
    }
  });

  it("leaves the fields a set write does not touch as they were", async () => {
    const { gameId, teamId, playerIds } = await seedGame();
    const set = startedSet(lineupFor(playerIds));

    const written: Game = await games().addSet({ gameId, setIndex: 0 }, set);

    expect(written).toMatchObject({ id: gameId, teamId, win: false });
    expect(written.teams.home.name).toBe("Home");
  });

  describe("adding a set", () => {
    const rawGame = (id: string) =>
      mongoose.connection
        .collection("games")
        .findOne({ _id: new mongoose.Types.ObjectId(id) });

    it.each([
      ["a game that does not exist", NotFoundError, "missing", 0],
      ["a gap before the last set", ValidationError, "empty", 1],
      ["an index a set already holds", ValidationError, "started", 0],
    ])("refuses %s and writes nothing", async (_name, error, kind, index) => {
      const { gameId, playerIds } = await seedGame();
      const set = startedSet(lineupFor(playerIds));
      if (kind === "started")
        await games().addSet({ gameId, setIndex: 0 }, set);
      const target = kind === "missing" ? oid() : gameId;
      const before = await rawGame(gameId);

      await expect(
        games().addSet({ gameId: target, setIndex: index }, set),
      ).rejects.toBeInstanceOf(error);
      if (kind === "missing")
        await expect(
          games().addSet({ gameId: target, setIndex: index }, set),
        ).rejects.toMatchObject({ reason: GameReason.GAME_NOT_FOUND });

      expect(await rawGame(gameId)).toEqual(before);
    });

    it("drops the home team's lineup when asked to", async () => {
      const { gameId, playerIds } = await seedGame();
      const id = new mongoose.Types.ObjectId(gameId);
      await mongoose.connection
        .collection("games")
        .updateOne({ _id: id }, { $set: { "teams.home.lineup": {} } });

      await games().addSet(
        { gameId, setIndex: 0 },
        startedSet(lineupFor(playerIds)),
        { clearTeamLineup: true },
      );

      expect((await rawGame(gameId))!.teams.home).not.toHaveProperty("lineup");
    });
  });
});
