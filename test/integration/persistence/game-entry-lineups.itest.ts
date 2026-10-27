import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { GameReason } from "@/entities/errors";
import { type Entry } from "@/entities/game";
import { Position } from "@/entities/team";
import { createRecordedSubstitution } from "@test/support/fixtures/entries";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { lineupFor, oid, seedGame, type SeededGame } from "../support/seed";

const operator = oid();
const recordedAt = new Date("2026-03-01T10:00:00.000Z");
const options = { serve: "home", time: { start: "10:00", end: "" } };

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

  it("applies a written substitution to the stored lineup", async () => {
    await write([substitution("sub-1", 1, benchIds[0]!)]);

    expect((await onCourt())[0]).toBe(benchIds[0]);
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

  it("recomputes the lineup when an edit changes a past substitution", async () => {
    await write([substitution("sub-1", 1, benchIds[0]!)]);

    await write(
      [substitution("sub-1", 1, benchIds[1]!)],
      new Date("2026-03-01T10:05:00.000Z"),
    );

    expect((await onCourt())[0]).toBe(benchIds[1]);
  });

  it("refuses a write that makes the substitutions inconsistent and stores nothing", async () => {
    await write([substitution("sub-1", 1, benchIds[0]!)]);
    // Player 0 already left the court at seq 1.
    const second = substitution("sub-2", 2, benchIds[1]!, 0);

    await expect(write([second])).rejects.toMatchObject({
      reason: GameReason.INVALID_SUBSTITUTION,
      httpStatus: 400,
    });

    const set = await storedSet();
    expect(set.entries.map((e) => e.id)).toEqual(["sub-1"]);
    expect((await onCourt())[0]).toBe(benchIds[0]);
  });
});
