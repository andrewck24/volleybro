import { MoveType } from "@/entities/game";
import { GameReason } from "@/entities/errors";
import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { PUT as createRally } from "@/app/api/games/[gameId]/sets/rallies/route";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { useFakeAuth } from "../support/auth";
import { callRoute } from "../support/request";
import { oid, seedGame, type SeededGame } from "../support/seed";

const recordedAt = "2026-03-01T10:00:00.000Z";
const editedAt = "2026-03-01T10:05:00.000Z";

const rally = {
  id: "entry-1",
  seq: 0,
  at: recordedAt,
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 0 },
  away: { score: 0, type: MoveType.ATTACK, num: 0 },
};

const options = { serve: "home", time: { start: "10:00", end: "" } };

describe("PUT /api/games/:id/sets/rallies", () => {
  let seeded: SeededGame;

  beforeEach(async () => {
    useFakeAuth();
    // A null roster id is not what broke rally recording, but create-set walks
    // the whole squad and must not throw on one.
    seeded = await seedGame({ includeNullIdPlayer: true });
  });

  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);

  it("creates the first set, persists it, then records a rally", async () => {
    const created = await callRoute(createSet, {
      gameId: seeded.gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: seeded.lineup, options },
    });
    expect(created.status).toBe(201);

    // The set must actually be in the database, not just in the response.
    const afterSet = await repo().findById(seeded.gameId);
    expect(afterSet!.sets).toHaveLength(1);

    const res = await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: [rally],
    });

    expect(res.status).toBe(200);
    const afterRally = await repo().findById(seeded.gameId);
    expect(afterRally!.sets[0]!.entries).toHaveLength(1);
    // The identity and sequence the client sent must round-trip unchanged.
    expect(afterRally!.sets[0]!.entries[0]).toMatchObject({
      id: rally.id,
      seq: rally.seq,
    });
  });

  it("returns 404 SET_NOT_FOUND for a set index that does not exist", async () => {
    const res = await callRoute(createRally, {
      gameId: seeded.gameId,
      method: "PUT",
      query: { si: 0 },
      body: [rally],
    });
    expect(res.status).toBe(404);
    expect((res.json as { reason?: string }).reason).toBe(
      GameReason.SET_NOT_FOUND,
    );
  });

  describe("who recorded and who edited", () => {
    const recorder = oid();
    const editor = oid();
    const sendRally = (body: unknown) =>
      callRoute(createRally, {
        gameId: seeded.gameId,
        method: "PUT",
        query: { si: 0 },
        body: [body],
      });
    const storedRally = async () =>
      (await repo().findById(seeded.gameId))!.sets[0]!.entries[0]!;

    beforeEach(async () => {
      const created = await callRoute(createSet, {
        gameId: seeded.gameId,
        method: "POST",
        query: { si: 0 },
        body: { lineup: seeded.lineup, options },
      });
      expect(created.status).toBe(201);
      useFakeAuth({ playerId: recorder });
    });

    it("stamps the sender's player and the client's time on a new entry", async () => {
      expect((await sendRally(rally)).status).toBe(200);

      const stored = await storedRally();
      expect(stored.recordedBy).toBe(recorder);
      expect(stored.recordedAt).toEqual(new Date(recordedAt));
      expect(stored.editedBy).toBeUndefined();
      expect(stored.editedAt).toBeUndefined();
    });

    it("rejects an entry that carries no time", async () => {
      const { at: _at, ...withoutAt } = rally;
      void _at;

      const res = await sendRally(withoutAt);

      expect(res.status).toBe(400);
      expect((await repo().findById(seeded.gameId))!.sets[0]!.entries).toEqual(
        [],
      );
    });

    it("writes nothing when the recorder resends the creation", async () => {
      await sendRally(rally);
      const before = await storedRally();

      expect((await sendRally(rally)).status).toBe(200);

      expect(await storedRally()).toEqual(before);
    });

    it("records the editor and keeps the original recorder and time", async () => {
      await sendRally(rally);
      useFakeAuth({ playerId: editor });

      const edited = {
        ...rally,
        at: editedAt,
        win: false,
        home: { ...rally.home, score: 0 },
        away: { ...rally.away, score: 1 },
      };
      expect((await sendRally(edited)).status).toBe(200);

      const stored = await storedRally();
      expect(stored).toMatchObject({
        win: false,
        home: { score: 0 },
        away: { score: 1 },
        recordedBy: recorder,
        editedBy: editor,
      });
      expect(stored.recordedAt).toEqual(new Date(recordedAt));
      expect(stored.editedAt).toEqual(new Date(editedAt));
    });

    it("leaves the result unchanged when an edit is resent", async () => {
      await sendRally(rally);
      useFakeAuth({ playerId: editor });
      const edited = { ...rally, at: editedAt, win: false };
      await sendRally(edited);
      const before = await storedRally();

      expect((await sendRally(edited)).status).toBe(200);

      expect(await storedRally()).toEqual(before);
    });

    it("does not let a delayed creation resend overwrite another member's edit", async () => {
      await sendRally(rally);
      useFakeAuth({ playerId: editor });
      await sendRally({ ...rally, at: editedAt, win: false });
      const before = await storedRally();
      useFakeAuth({ playerId: recorder });

      expect((await sendRally(rally)).status).toBe(200);

      expect(await storedRally()).toEqual(before);
    });
  });
});
