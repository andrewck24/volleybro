import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { GameReason } from "@/entities/errors";
import { MoveType, type Entry } from "@/entities/game";
import { createRecordedRally } from "@test/support/fixtures/entries";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { oid, seedGame, type SeededGame } from "../support/seed";

const rally = (
  id: string,
  seq: number,
  score: number,
  playerId: string | null = null,
): Entry =>
  createRecordedRally({
    id,
    seq,
    home: {
      score,
      type: MoveType.ATTACK,
      num: 0,
      player: { id: playerId, zone: 1 },
    },
  });

const operator = oid();
const recordedAt = new Date("2026-03-01T10:00:00.000Z");
const editedAt = new Date("2026-03-01T10:05:00.000Z");

const options = { serve: "home", time: { start: "10:00", end: "" } };

describe("identity-keyed entry writes", () => {
  let seeded: SeededGame;
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);
  const write = (
    ref: { gameId: string; setIndex: number },
    entries: Entry[],
    at = recordedAt,
  ) =>
    repo().upsertEntries(
      ref,
      entries.map((entry) => ({ entry, at })),
      operator,
    );

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

  it("re-classifies a create that lost a race to another create instead of dropping it", async () => {
    const ref = { gameId: seeded.gameId, setIndex: 0 };
    const other = oid();
    const instance = repo();
    await instance.upsertEntries(
      ref,
      [{ entry: rally("entry-1", 0, 1), at: recordedAt }],
      other,
    );
    // The pre-read ran before the other create landed.
    const internals = instance as unknown as {
      findSet: (ref: unknown) => Promise<object>;
    };
    const set = await internals.findSet(ref);
    jest
      .spyOn(internals, "findSet")
      .mockResolvedValueOnce({ ...set, entries: [] });

    const entries = await instance.upsertEntries(
      ref,
      [{ entry: rally("entry-1", 0, 9), at: editedAt }],
      operator,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      home: { score: 9 },
      recordedBy: other,
      editedBy: operator,
      editedAt,
    });
  });

  it("keeps both entries when two different identities are written concurrently", async () => {
    await Promise.all([
      write({ gameId: seeded.gameId, setIndex: 0 }, [rally("entry-a", 0, 1)]),
      write({ gameId: seeded.gameId, setIndex: 0 }, [rally("entry-b", 1, 2)]),
    ]);

    const persisted = await repo().findById(seeded.gameId);
    expect(persisted!.sets[0]!.entries.map((e) => e.id).sort()).toEqual([
      "entry-a",
      "entry-b",
    ]);
  });

  it("rejects an entry the database cannot store without touching the set", async () => {
    await write({ gameId: seeded.gameId, setIndex: 0 }, [
      rally("entry-1", 0, 1),
    ]);

    await expect(
      write({ gameId: seeded.gameId, setIndex: 0 }, [
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
      write({ gameId: oid(), setIndex: 0 }, [rally("entry-1", 0, 1)]),
    ).rejects.toMatchObject({
      reason: GameReason.GAME_NOT_FOUND,
      httpStatus: 404,
    });
  });
});
