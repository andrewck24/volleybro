import { EntryType, Side } from "@/entities/game";
import { Position } from "@/entities/team";
import { applySubstitution } from "@/lib/features/game/helpers";
import type { GameView, PendingSubstitution } from "@/lib/features/game/types";

const lineup = {
  options: {
    liberoReplaceMode: 0 as const,
    liberoReplacePosition: Position.NONE,
  },
  starting: [{ id: "player-1", position: Position.OH }],
  liberos: [],
  substitutes: [{ id: "player-8", position: Position.OH }],
};

const game = () =>
  ({
    sets: [
      {
        startingLineups: { home: lineup },
        lineups: { home: lineup },
        entries: [],
      },
    ],
  }) as unknown as GameView;

const substitution = (players: {
  in: string;
  out: string;
}): PendingSubstitution => ({
  type: EntryType.SUBSTITUTION,
  id: "sub-1",
  seq: 0,
  at: "2026-10-27T01:02:03.000Z",
  team: Side.HOME,
  players,
});

describe("applySubstitution", () => {
  it("refuses a substitution whose outgoing player is not on court", () => {
    expect(
      applySubstitution(
        game(),
        0,
        substitution({ in: "player-8", out: "player-9" }),
      ),
    ).toEqual({ invalid: { id: "sub-1", points: 0 } });
  });
});
