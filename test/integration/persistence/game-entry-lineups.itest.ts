import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { GameReason } from "@/entities/errors";
import { type Entry } from "@/entities/game";
import { Position } from "@/entities/team";
import { createRecordedSubstitution } from "@test/support/fixtures/entries";
import mongoose from "mongoose";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { lineupFor, oid, seedGame, type SeededGame } from "../support/seed";

const operator = oid();
const recordedAt = new Date("2026-03-01T10:00:00.000Z");
const options = { serve: "home" as const, time: { start: "10:00", end: "" } };

describe("the lineup a set stores with its entries", () => {
  let seeded: SeededGame;
  let benchIds: string[];
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);
  const ref = () => ({ gameId: seeded.gameId, setIndex: 0 });
  const substitution = (id: string, seq: number, inId: string, outId = 0) =>
    createRecordedSubstitution({
      id,
      seq,
      players: { in: inId, out: seeded.playerIds[outId]! },
    }) as Entry;
  const write = (entries: Entry[], at = recordedAt) =>
    repo().upsertEntry(
      ref(),
      entries.map((entry) => ({ entry, at })),
      operator,
    );
  const storedSet = async () =>
    (await repo().findById(seeded.gameId))!.sets[0]!;
  const onCourt = async () =>
    (await storedSet()).lineups.home.starting.map((p) => p.id);

  afterEach(() => jest.restoreAllMocks());

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame({ playerCount: 8 });
    benchIds = seeded.playerIds.slice(6);
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: {
        lineup: {
          ...lineupFor(seeded.playerIds),
          substitutes: benchIds.map((id) => ({ id, position: Position.OH })),
        },
        options,
      },
    });
    expect(created.status).toBe(201);
  });

  it("keeps the stored lineup in step with the stored entry when a resend carries other content", async () => {
    await write([substitution("sub-1", 1, benchIds[0]!)]);

    // Same id and same `at` by the same operator is a resend of the creation,
    // so the different content must not reach the lineup either.
    await write([substitution("sub-1", 1, benchIds[1]!)]);

    const set = await storedSet();
    expect(set.entries[0]).toMatchObject({ players: { in: benchIds[0] } });
    expect((await onCourt())[0]).toBe(benchIds[0]);
  });

  it("re-plans a substitution written from a stale read, so the second of two conflicting ones is refused", async () => {
    const instance = repo();
    const internals = instance as unknown as {
      findSet: (ref: unknown) => Promise<object>;
    };
    const stale = await internals.findSet(ref());
    // Another device records its substitution after this one read the set.
    await write([substitution("sub-1", 1, benchIds[0]!)]);
    jest.spyOn(internals, "findSet").mockResolvedValueOnce(stale);

    // Player 0 is already out, which the stale read cannot show.
    await expect(
      instance.upsertEntry(
        ref(),
        [{ entry: substitution("sub-2", 2, benchIds[1]!, 0), at: recordedAt }],
        operator,
      ),
    ).rejects.toMatchObject({
      reason: GameReason.INVALID_SUBSTITUTION,
      httpStatus: 400,
    });

    expect((await storedSet()).entries.map((e) => e.id)).toEqual(["sub-1"]);
    expect((await onCourt())[0]).toBe(benchIds[0]);
  });

  it("keeps lineups and entries in step when two devices substitute different players at once", async () => {
    await Promise.all([
      write([substitution("sub-a", 1, benchIds[0]!, 0)]),
      write([substitution("sub-b", 2, benchIds[1]!, 1)]),
    ]);

    const set = await storedSet();
    expect(set.entries.map((e) => e.id)).toEqual(["sub-a", "sub-b"]);
    expect(await onCourt()).toEqual(
      expect.arrayContaining([benchIds[0], benchIds[1]]),
    );
  });

  it("does not lose an entry written while the starting lineup is being updated", async () => {
    const instance = repo();
    const internals = instance as unknown as {
      findSet: (ref: unknown) => Promise<object>;
    };
    const stale = await internals.findSet(ref());
    await write([substitution("sub-1", 1, benchIds[0]!)]);
    jest.spyOn(internals, "findSet").mockResolvedValueOnce(stale);
    const game = (await repo().findById(seeded.gameId))!;
    const lineup = game.sets[0]!.startingLineups.home;

    await instance.updateSet(ref(), { options, lineup });

    expect((await storedSet()).entries.map((e) => e.id)).toEqual(["sub-1"]);
    expect((await onCourt())[0]).toBe(benchIds[0]);
  });

  it("keeps an existing set's entries and revision when the next set is created", async () => {
    await write([substitution("sub-1", 1, benchIds[0]!)]);
    const revOf = async () =>
      (await mongoose.connection
        .collection("games")
        .findOne({ _id: new mongoose.Types.ObjectId(seeded.gameId) }))!.sets[0]
        .rev;
    const before = await revOf();
    expect(before).toBeGreaterThan(0);

    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 1 },
      body: { lineup: lineupFor(seeded.playerIds), options },
    });

    expect(created.status).toBe(201);
    expect(await revOf()).toBe(before);
    const game = await repo().findById(seeded.gameId);
    expect(game!.sets).toHaveLength(2);
    expect(game!.sets[0]!.entries.map((e) => e.id)).toEqual(["sub-1"]);
  });
});
