import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { GameReason } from "@/entities/errors";
import { EntryType, MoveType, type Entry } from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { oid, seedGame, type SeededGame } from "./support/seed";

const rally = (score: number, playerId: string | null = null): Entry =>
  ({
    type: EntryType.RALLY,
    win: true,
    home: {
      score,
      type: MoveType.ATTACK,
      num: 0,
      player: { id: playerId, zone: 1 },
    },
    away: { score: 0, type: MoveType.ATTACK, num: 0 },
  }) as unknown as Entry;

const options = { serve: "home", time: { start: "10:00", end: "" } };

describe("positional entry writes", () => {
  let seeded: SeededGame;
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame();
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });
    expect(created.status).toBe(201);
  });

  it("appends entries one at a time and returns the set's entries", async () => {
    expect(
      await repo().appendEntry(
        { gameId: seeded.gameId, setIndex: 0 },
        rally(1),
      ),
    ).toHaveLength(1);

    const entries = await repo().appendEntry(
      { gameId: seeded.gameId, setIndex: 0 },
      rally(2, seeded.playerIds[0]!),
    );

    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      type: EntryType.RALLY,
      home: { score: 2, player: { id: seeded.playerIds[0] } },
    });
    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries).toHaveLength(2);
  });

  it("replaces one entry and leaves its neighbours alone", async () => {
    await repo().appendEntry({ gameId: seeded.gameId, setIndex: 0 }, rally(1));
    await repo().appendEntry({ gameId: seeded.gameId, setIndex: 0 }, rally(2));

    const entries = await repo().replaceEntry(
      { gameId: seeded.gameId, setIndex: 0, entryIndex: 0 },
      rally(9),
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ home: { score: 9 } });
    expect(entries[1]).toMatchObject({ home: { score: 2 } });
  });

  it("rejects an entry the database cannot store without touching the set", async () => {
    await repo().appendEntry({ gameId: seeded.gameId, setIndex: 0 }, rally(1));

    await expect(
      repo().appendEntry(
        { gameId: seeded.gameId, setIndex: 0 },
        rally(2, "not-an-object-id"),
      ),
    ).rejects.toMatchObject({ httpStatus: 400 });

    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries).toHaveLength(1);
    expect(persisted!.sets[0]!.entries[0]).toMatchObject({
      home: { score: 1 },
    });
  });

  it("reports GAME_NOT_FOUND for a game that does not exist", async () => {
    await expect(
      repo().appendEntry({ gameId: oid(), setIndex: 0 }, rally(1)),
    ).rejects.toMatchObject({
      reason: GameReason.GAME_NOT_FOUND,
      httpStatus: 404,
    });
  });

  it("reports SET_NOT_FOUND for a set index the game does not have", async () => {
    await expect(
      repo().appendEntry({ gameId: seeded.gameId, setIndex: 3 }, rally(1)),
    ).rejects.toMatchObject({
      reason: GameReason.SET_NOT_FOUND,
      httpStatus: 404,
    });

    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets).toHaveLength(1);
  });

  it("reports SET_NOT_FOUND for an entry index that is not in the set", async () => {
    await expect(
      repo().replaceEntry(
        { gameId: seeded.gameId, setIndex: 0, entryIndex: 4 },
        rally(1),
      ),
    ).rejects.toMatchObject({ reason: GameReason.SET_NOT_FOUND });

    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries).toHaveLength(0);
  });
});
