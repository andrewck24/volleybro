import { EntryType, MoveType } from "@/entities/game";
import gameReducer, { gameActions } from "@/lib/features/game/game-slice";
import type { GameView } from "@/lib/features/game/types";

describe("game-slice initialize", () => {
  it("derives set stats even when the game's stored counters were never written", () => {
    const game = {
      id: "game-1",
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
      sets: [
        {
          options: { serve: "home" },
          entries: [
            {
              type: EntryType.RALLY,
              win: true,
              home: {
                score: 1,
                type: MoveType.ATTACK,
                num: 1,
                player: { id: "player-1", zone: 1 },
              },
              away: { score: 0, type: MoveType.DEFENSE, num: 1 },
            },
          ],
        },
      ],
      teams: {
        home: { players: [{ id: "player-1", stats: [] }], stats: [] },
        away: { players: [], stats: [] },
      },
    } as unknown as GameView;

    const state = gameReducer(
      undefined,
      gameActions.initialize({ game, setIndex: 0 }),
    );

    expect(state.general.status.stats.home[MoveType.ATTACK].success).toBe(1);
    expect(state.general.status.stats.away[MoveType.DEFENSE].error).toBe(1);
    expect(
      state.general.status.stats.players["player-1"]?.[MoveType.ATTACK],
    ).toEqual({ success: 1, error: 0 });
  });
});

describe("game-slice setEditingEntryStatus", () => {
  it("loads the target entry's identity onto the editing draft", () => {
    const game = {
      id: "game-1",
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
      sets: [
        {
          options: { serve: "home" },
          entries: [
            {
              type: EntryType.RALLY,
              id: "entry-1",
              seq: 0,
              win: true,
              home: {
                score: 1,
                type: MoveType.ATTACK,
                num: 1,
                player: { id: "player-1", zone: 1 },
              },
              away: { score: 0, type: MoveType.DEFENSE, num: 1 },
            },
          ],
        },
      ],
      teams: {
        home: { players: [{ id: "player-1", stats: [] }], stats: [] },
        away: { players: [], stats: [] },
      },
    } as unknown as GameView;

    const initialized = gameReducer(
      undefined,
      gameActions.initialize({ game, setIndex: 0 }),
    );
    const state = gameReducer(
      initialized,
      gameActions.setEditingEntryStatus({ game, entryIndex: 0 }),
    );

    expect(state.editing.entryDraft.id).toBe("entry-1");
    expect(state.editing.entryDraft.seq).toBe(0);
  });
});
