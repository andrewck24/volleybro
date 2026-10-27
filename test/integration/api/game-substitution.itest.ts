import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { EntryType, MoveType, Side } from "@/entities/game";
import { Position } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { PUT as recordEntries } from "@/app/api/games/[gameId]/sets/entries/route";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { lineupFor, oid, seedGame, type SeededGame } from "../support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };
const at = "2026-03-01T10:01:00.000Z";
const editedAt = "2026-03-01T10:05:00.000Z";

const rally = (seq: number) => ({
  type: EntryType.RALLY,
  id: `entry-rally-${seq}`,
  seq,
  at: "2026-03-01T10:00:00.000Z",
  win: true,
  home: { score: seq + 1, type: MoveType.ATTACK, num: 0 },
  away: { score: 0, type: MoveType.ATTACK, num: 0 },
});

describe("PUT /api/games/:id/sets/entries with substitutions", () => {
  let seeded: SeededGame;
  let bench: string[];
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);
  const substitution = (
    id: string,
    seq: number,
    inId: string,
    outId: string,
  ) => ({
    type: EntryType.SUBSTITUTION,
    id,
    seq,
    at,
    team: Side.HOME,
    players: { in: inId, out: outId },
  });
  const send = (body: unknown[]) =>
    callRoute(recordEntries, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body,
    });
  const storedSet = async () =>
    (await repo().findById(seeded.gameId))!.sets[0]!;
  const onCourt = async () =>
    (await storedSet()).lineups.home.starting.map((p) => p.id);

  beforeEach(async () => {
    useFakeAuth();
    seeded = await seedGame({ playerCount: 8 });
    bench = seeded.playerIds.slice(6);
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: {
        lineup: {
          ...lineupFor(seeded.playerIds),
          substitutes: bench.map((id) => ({ id, position: Position.OH })),
        },
        options,
      },
    });
    expect(created.status).toBe(201);
  });

  it("records the sender's player and the client's time on the entry", async () => {
    const recorder = oid();
    useFakeAuth({ playerId: recorder });

    const res = await send([
      substitution("entry-sub-1", 0, bench[0]!, seeded.playerIds[0]!),
    ]);

    expect(res.status).toBe(200);
    const [entry] = (await storedSet()).entries;
    expect(entry).toMatchObject({
      type: EntryType.SUBSTITUTION,
      recordedBy: recorder,
    });
    expect(entry!.recordedAt).toEqual(new Date(at));
  });

  it("rejects a substitution that carries no time", async () => {
    const { at: _at, ...withoutAt } = substitution(
      "entry-sub-1",
      0,
      bench[0]!,
      seeded.playerIds[0]!,
    );
    void _at;

    expect((await send([withoutAt])).status).toBe(400);
  });

  it("stores rallies and substitutions of one request by seq and swaps the lineup", async () => {
    // Sent out of order: the lineup must follow seq, not arrival.
    const res = await send([
      substitution("sub-2", 3, bench[1]!, seeded.playerIds[1]!),
      rally(2),
      substitution("sub-1", 1, bench[0]!, seeded.playerIds[0]!),
      rally(0),
    ]);

    expect(res.status).toBe(200);
    const set = await storedSet();
    expect(set.entries.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
    expect(set.entries.map((e) => e.type)).toEqual([
      EntryType.RALLY,
      EntryType.SUBSTITUTION,
      EntryType.RALLY,
      EntryType.SUBSTITUTION,
    ]);
    expect(set.lineups.home.starting[0]).toMatchObject({
      id: bench[0],
      sub: { id: seeded.playerIds[0], entryIndex: { in: 1 } },
    });
    expect(set.lineups.home.starting[1]).toMatchObject({
      id: bench[1],
      sub: { id: seeded.playerIds[1], entryIndex: { in: 3 } },
    });
  });

  it("leaves the lineup as it was when the same substitution is sent again", async () => {
    const body = [substitution("sub-1", 1, bench[0]!, seeded.playerIds[0]!)];

    expect((await send(body)).status).toBe(200);
    const once = await storedSet();
    expect((await send(body)).status).toBe(200);
    const twice = await storedSet();

    expect(twice.lineups).toEqual(once.lineups);
    expect(twice.entries).toHaveLength(1);
    expect((await onCourt())[0]).toBe(bench[0]);
  });

  it("rejects a substitution whose outgoing player is not on court and changes nothing", async () => {
    const res = await send([substitution("sub-1", 1, bench[0]!, oid())]);

    expect(res.status).toBe(400);
    const set = await storedSet();
    expect(set.entries).toHaveLength(0);
    expect(set.lineups).toEqual(set.startingLineups);
  });

  it("stores none of a request that holds one invalid substitution", async () => {
    const res = await send([
      rally(0),
      substitution("sub-1", 1, bench[0]!, oid()),
    ]);

    expect(res.status).toBe(400);
    expect((await storedSet()).entries).toHaveLength(0);
  });

  describe("editing a substitution already stored", () => {
    const recorder = oid();
    const editor = oid();

    beforeEach(async () => {
      useFakeAuth({ playerId: recorder });
      await send([
        substitution("sub-1", 1, bench[0]!, seeded.playerIds[0]!),
        substitution("sub-2", 2, bench[1]!, bench[0]!),
      ]);
      useFakeAuth({ playerId: editor });
    });

    it("recomputes the lineup and keeps the recorder and time", async () => {
      // sub-2 swaps out whoever sub-1 brought on, so sub-1 changes first.
      const res = await send([
        {
          ...substitution("sub-2", 2, bench[1]!, seeded.playerIds[2]!),
          at: editedAt,
        },
      ]);

      expect(res.status).toBe(200);
      const set = await storedSet();
      expect(set.entries[1]).toMatchObject({
        players: { out: seeded.playerIds[2] },
        recordedBy: recorder,
        editedBy: editor,
      });
      expect(set.entries[1]!.recordedAt).toEqual(new Date(at));
      expect(set.entries[1]!.editedAt).toEqual(new Date(editedAt));
      expect(await onCourt()).toEqual([
        bench[0],
        seeded.playerIds[1],
        bench[1],
        ...seeded.playerIds.slice(3, 6),
      ]);
    });

    it("refuses an edit that invalidates a later substitution and changes nothing", async () => {
      const before = await storedSet();

      const res = await send([
        {
          ...substitution("sub-1", 1, bench[1]!, seeded.playerIds[0]!),
          at: editedAt,
        },
      ]);

      expect(res.status).toBe(400);
      expect(await storedSet()).toEqual(before);
    });
  });
});
