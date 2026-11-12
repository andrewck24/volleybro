import type { SetLineups } from "@/entities/game";
import { applySubstitution } from "@/lib/features/game/helpers/optimistic/substitution.helper";
import type { GameView, PendingSubstitution } from "@/lib/features/game/types";
import { lineup, onCourt, sub } from "@test/support/fixtures/lineup-writes";

const startingLineups: SetLineups = { home: lineup() };

const game = {
  sets: [{ startingLineups, entries: [] }],
} as unknown as GameView;

describe("applySubstitution", () => {
  it("returns the game with the substitution recorded and the lineup recomputed", () => {
    const entry = {
      ...sub(0, "a", "x"),
      at: "2026-01-01T10:00:00.000Z",
    } as PendingSubstitution;

    const result = applySubstitution(game, 0, entry);

    if (!("game" in result)) throw new Error("expected a game");
    const set = result.game.sets[0]!;
    expect(set.entries.map((e) => e.id)).toEqual(["sub-0"]);
    expect(onCourt(set.lineups)).toEqual(["x", "b", "c", "d", "e", "f"]);
  });
});
