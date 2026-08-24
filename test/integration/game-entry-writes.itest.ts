import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { GameReason } from "@/entities/errors";
import { EntryType, MoveType, type Entry } from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { oid, seedGame, type SeededGame } from "./support/seed";

const rally = (
  id: string,
  seq: number,
  score: number,
  playerId: string | null = null,
): Entry =>
  ({
    type: EntryType.RALLY,
    id,
    seq,
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

describe("identity-keyed entry writes", () => {
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

  it("writes new entries and returns the set's entries", async () => {
    expect(
      await repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
        rally("entry-1", 0, 1),
      ]),
    ).toHaveLength(1);

    const entries = await repo().upsertEntry(
      { gameId: seeded.gameId, setIndex: 0 },
      [rally("entry-2", 1, 2, seeded.playerIds[0]!)],
    );

    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      type: EntryType.RALLY,
      home: { score: 2, player: { id: seeded.playerIds[0] } },
    });
    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries).toHaveLength(2);
  });

  it("resending an entry writes nothing new and is not an error", async () => {
    await repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
      rally("entry-1", 0, 1),
    ]);
    await repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
      rally("entry-2", 1, 2),
    ]);

    const entries = await repo().upsertEntry(
      { gameId: seeded.gameId, setIndex: 0 },
      [rally("entry-1", 0, 1)],
    );

    expect(entries).toHaveLength(2);
    expect(entries.filter((e) => e.id === "entry-1")).toHaveLength(1);
    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries).toHaveLength(2);
  });

  it("overwrites an existing identity's payload rather than duplicating it", async () => {
    await repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
      rally("entry-1", 0, 1),
    ]);

    const entries = await repo().upsertEntry(
      { gameId: seeded.gameId, setIndex: 0 },
      [rally("entry-1", 0, 9)],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ home: { score: 9 } });
  });

  it("stores a lower-sequence entry ahead of a higher one that arrived first", async () => {
    await repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
      rally("entry-8", 8, 8),
    ]);

    const entries = await repo().upsertEntry(
      { gameId: seeded.gameId, setIndex: 0 },
      [rally("entry-7", 7, 7)],
    );

    expect(entries.map((e) => e.id)).toEqual(["entry-7", "entry-8"]);
  });

  it("keeps both entries when two different identities are written concurrently", async () => {
    await Promise.all([
      repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
        rally("entry-a", 0, 1),
      ]),
      repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
        rally("entry-b", 1, 2),
      ]),
    ]);

    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries.map((e) => e.id).sort()).toEqual([
      "entry-a",
      "entry-b",
    ]);
  });

  it("rejects an entry the database cannot store without touching the set", async () => {
    await repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
      rally("entry-1", 0, 1),
    ]);

    await expect(
      repo().upsertEntry({ gameId: seeded.gameId, setIndex: 0 }, [
        rally("entry-2", 1, 2, "not-an-object-id"),
      ]),
    ).rejects.toMatchObject({ httpStatus: 400 });

    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries).toHaveLength(1);
    expect(persisted!.sets[0]!.entries[0]).toMatchObject({
      home: { score: 1 },
    });
  });

  it("reports GAME_NOT_FOUND for a game that does not exist", async () => {
    await expect(
      repo().upsertEntry({ gameId: oid(), setIndex: 0 }, [
        rally("entry-1", 0, 1),
      ]),
    ).rejects.toMatchObject({
      reason: GameReason.GAME_NOT_FOUND,
      httpStatus: 404,
    });
  });

  it("reports SET_NOT_FOUND for a set index the game does not have", async () => {
    await expect(
      repo().upsertEntry({ gameId: seeded.gameId, setIndex: 3 }, [
        rally("entry-1", 0, 1),
      ]),
    ).rejects.toMatchObject({
      reason: GameReason.SET_NOT_FOUND,
      httpStatus: 404,
    });

    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets).toHaveLength(1);
  });
});
