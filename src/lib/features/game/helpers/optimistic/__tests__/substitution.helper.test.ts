import { EntryType, MoveType, Side } from "@/entities/game";
import { applySubstitution } from "@/lib/features/game/helpers/optimistic/substitution.helper";
import type { GameView, PendingSubstitution } from "@/lib/features/game/types";

const lineup = {
  options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
  starting: [{ id: "a", position: "OH" }],
  liberos: [],
  substitutes: [
    { id: "x", position: "" },
    { id: "y", position: "" },
  ],
};

const sub = (
  id: string,
  seq: number,
  players: { in: string; out: string },
): PendingSubstitution => ({
  type: EntryType.SUBSTITUTION,
  id,
  seq,
  at: "2026-01-01T10:00:00.000Z",
  team: Side.HOME,
  players,
});

const rally = {
  type: EntryType.RALLY,
  id: "rally-1",
  seq: 1,
  win: true,
  home: { score: 3, type: MoveType.ATTACK, num: 1 },
  away: { score: 2, type: MoveType.ATTACK, num: 1 },
};

const gameWith = (entries: unknown[]) =>
  ({
    sets: [{ startingLineups: { home: lineup }, entries }],
  }) as unknown as GameView;

describe("applySubstitution", () => {
  it("returns the game with the substitution recorded and the lineup recomputed", () => {
    const result = applySubstitution(
      gameWith([]),
      0,
      sub("s1", 0, { in: "x", out: "a" }),
    );

    if (!("game" in result)) throw new Error("expected a game");
    const set = result.game.sets[0]!;
    expect(set.entries.map((e) => e.id)).toEqual(["s1"]);
    expect(set.lineups.home?.starting.map((p) => p.id)).toEqual(["x"]);
  });

  it("returns the refused substitution with the score before it, or 0:0 if none", () => {
    expect(
      applySubstitution(gameWith([]), 0, sub("s1", 0, { in: "x", out: "z" })),
    ).toEqual({
      invalid: { substitutionId: "s1", scoreBefore: { home: 0, away: 0 } },
    });
    expect(
      applySubstitution(
        gameWith([rally]),
        0,
        sub("s2", 2, { in: "x", out: "z" }),
      ),
    ).toEqual({
      invalid: { substitutionId: "s2", scoreBefore: { home: 3, away: 2 } },
    });
  });

  it("names a later substitution the written one breaks", () => {
    const later = sub("later", 5, { in: "a", out: "x" });
    const result = applySubstitution(
      gameWith([later]),
      0,
      sub("s1", 1, { in: "y", out: "a" }),
    );

    expect(result).toMatchObject({ invalid: { substitutionId: "later" } });
  });
});
