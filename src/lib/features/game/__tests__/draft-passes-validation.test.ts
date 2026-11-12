import { EntryType } from "@/entities/game";
import { gameActions } from "@/lib/features/game/game-slice";
import type { GameView } from "@/lib/features/game/types";
import { RecordEntriesSchema } from "@/interface/validations/game";
import { makeStore } from "@/lib/redux/store";
import {
  backMoves,
  errorMoves,
  frontMoves,
  scoringMoves,
} from "@/lib/scoring-moves";
import {
  createLineupGame,
  homeRally,
} from "@test/support/fixtures/lineup-game";

const submitted = (store: ReturnType<typeof makeStore>) => {
  const gameState = store.getState().game;
  const { entryDraft } = gameState[gameState.mode];
  return {
    ...entryDraft,
    type: EntryType.RALLY,
    id: entryDraft.id || "e1",
    seq: entryDraft.seq,
    at: new Date().toISOString(),
  };
};

const passesSchema = (store: ReturnType<typeof makeStore>) =>
  RecordEntriesSchema.safeParse([submitted(store)]).success;

const homeMoves = [...new Set([...frontMoves, ...backMoves])].sort(
  (a, b) => a.num - b.num,
);

describe("the draft a recorded rally is submitted as", () => {
  it.each(homeMoves.map((move) => [`${move.text} (num ${move.num})`, move]))(
    "passes validation after picking %s and its first outcome",
    (_name, move) => {
      const store = makeStore();
      store.dispatch(gameActions.setEntryDraftHomeMove(move));
      store.dispatch(
        gameActions.setEntryDraftAwayMove(scoringMoves[move.outcome[0]!]!),
      );

      expect(passesSchema(store)).toBe(true);
    },
  );

  it.each(errorMoves.map((move) => [`${move.text} (num ${move.num})`, move]))(
    "passes validation after picking the opponent error %s",
    (_name, move) => {
      const store = makeStore();
      store.dispatch(gameActions.setEntryDraftHomeMove(move));

      expect(passesSchema(store)).toBe(true);
    },
  );

  it("rejects the untouched draft, which is why the panel gates submission", () => {
    expect(passesSchema(makeStore())).toBe(false);
  });

  it("preserves entry identity when an edit is submitted", () => {
    const game = createLineupGame({ entries: [homeRally(true, 10)] });
    const view = game as unknown as GameView;
    const store = makeStore();
    store.dispatch(gameActions.initialize({ game: view, setIndex: 0 }));
    store.dispatch(
      gameActions.setEditingEntryStatus({ game: view, entryIndex: 0 }),
    );

    const entry = submitted(store);

    expect(entry).toMatchObject({ id: "e10", seq: 10 });
    expect(RecordEntriesSchema.safeParse([entry]).success).toBe(true);
  });
});

describe("the substitution a recorded entry is submitted as", () => {
  const OID = "507f1f77bcf86cd799439011";

  it("is not drafted at all until a player is on the way out", () => {
    const store = makeStore();

    store.dispatch(gameActions.setEntryDraftSubstitution(OID));

    expect(
      store.getState().game.general.entryDraft.substitution,
    ).toBeUndefined();
  });
});
