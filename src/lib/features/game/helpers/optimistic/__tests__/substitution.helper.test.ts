import { EntryType, Side } from "@/entities/game";
import { Position } from "@/entities/team";
import { applySubstitution } from "@/lib/features/game/helpers";
import type { GameView, PendingEntryContent } from "@/lib/features/game/types";

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
}): Extract<PendingEntryContent, { team: unknown }> => ({
  type: EntryType.SUBSTITUTION,
  id: "sub-1",
  seq: 0,
  at: "2026-10-27T01:02:03.000Z",
  team: Side.HOME,
  players,
});

describe("applySubstitution", () => {
  it("records the substitution and swaps the players in the lineup", () => {
    const { game: result } = applySubstitution(
      game(),
      0,
      substitution({ in: "player-8", out: "player-1" }),
    ) as { game: GameView };

    expect(result.sets[0]!.entries).toHaveLength(1);
    expect(result.sets[0]!.lineups.home.starting[0]).toMatchObject({
      id: "player-8",
      sub: { id: "player-1", entryIndex: { in: 0 } },
    });
  });

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
