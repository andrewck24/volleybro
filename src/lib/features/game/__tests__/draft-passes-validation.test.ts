import { EntryType } from "@/entities/game";
import { gameActions } from "@/lib/features/game/game-slice";
import { RecordEntriesSchema } from "@/interface/validations/game";
import { game, rally } from "@test/support/fixtures/editing-game";
import { makeStore } from "@/lib/redux/store";
import {
  backMoves,
  errorMoves,
  frontMoves,
  scoringMoves,
} from "@/lib/scoring-moves";

const submitted = (store: ReturnType<typeof makeStore>) => {
  const { entryDraft } = store.getState().game.general;
  return {
    ...entryDraft,
    type: EntryType.RALLY,
    id: "e1",
    seq: 0,
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

describe("the draft an edited rally is submitted as", () => {
  const OID = "507f1f77bcf86cd799439011";

  it("passes validation when a side of the recorded rally has no player", () => {
    const store = makeStore();
    const [firstSet] = game.sets;
    const unplayered = {
      ...game,
      sets: [
        {
          ...firstSet!,
          entries: [
            {
              ...rally,
              home: { ...rally.home, player: { id: OID, zone: 1 } },
              away: { ...rally.away, player: { id: null, zone: 0 } },
            },
          ],
        },
      ],
    };
    const view = unplayered as never;
    store.dispatch(gameActions.initialize({ game: view, setIndex: 0 }));
    store.dispatch(
      gameActions.setEditingEntryStatus({ game: view, entryIndex: 0 }),
    );

    const { entryDraft } = store.getState().game.editing;

    expect(
      RecordEntriesSchema.safeParse([
        { ...entryDraft, type: EntryType.RALLY, at: new Date().toISOString() },
      ]).success,
    ).toBe(true);
  });
});
