import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { MoveType, type Entry } from "@/entities/game";
import { createRecordedRally } from "@test/support/fixtures/entries";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { oid, seedGame, type SeededGame } from "../support/seed";
import mongoose from "mongoose";

const rally = (
  id: string | undefined,
  seq: number | undefined,
  score: number,
): Entry =>
  createRecordedRally({
    id,
    seq,
    home: {
      score,
      type: MoveType.ATTACK,
      num: 0,
      player: { id: null, zone: 1 },
    },
  } as never);

const options = { serve: "home", time: { start: "10:00", end: "" } };

describe("a write whose entry carries no identity", () => {
  let seeded: SeededGame;
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);
  const operator = oid();
  const write = (ref: { gameId: string; setIndex: number }, entry: Entry) =>
    repo().upsertEntry(
      ref,
      [{ entry, at: new Date("2026-03-01T10:00:00.000Z") }],
      operator,
    );

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame();
    expect(
      (
        await callRoute(createSet, {
          gameId: seeded.gameId,
          method: "POST",
          query: { si: 0 },
          body: { lineup: seeded.lineup, options },
        })
      ).status,
    ).toBe(201);
  });

  // Without the guard this does not fail -- it silently rewrites every
  // entry that also lacks an id, because `id: undefined` reaches Mongo as
  // `null` and the arrayFilters then match all of them at once.
  it("refuses a write whose entry carries no identity, leaving the set untouched", async () => {
    const ref = { gameId: seeded.gameId, setIndex: 0 };
    await write(ref, rally("a", 0, 1));
    await write(ref, rally("b", 1, 2));

    const model = mongoose.models.Game!;
    await model.updateOne(
      { _id: seeded.gameId },
      {
        $unset: {
          "sets.0.entries.0.id": "",
          "sets.0.entries.0.seq": "",
          "sets.0.entries.1.id": "",
          "sets.0.entries.1.seq": "",
        },
      },
    );

    await expect(write(ref, rally(undefined, undefined, 99))).rejects.toThrow(
      /id and a seq/,
    );

    const doc = (await model.findById(seeded.gameId).lean()) as unknown as {
      sets: { entries: { home?: { score?: number } }[] }[];
    };
    expect(doc.sets[0]!.entries.map((e) => e.home?.score)).toEqual([1, 2]);
  });
});
