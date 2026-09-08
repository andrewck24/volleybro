import { gameActions } from "@/lib/features/game/game-slice";
import { RecordRalliesSchema } from "@/interface/validations/game";
import { makeStore } from "@/lib/redux/store";
import {
  backMoves,
  errorMoves,
  frontMoves,
  scoringMoves,
} from "@/lib/scoring-moves";

// What the recorder submits is the draft itself, cast to a rally
// (`{ ...(draft as RallyView), id, seq }` in the moves panel), and the draft's
// own type allows null where the schema now demands a value. Reading the
// reducers says they always fill those in; nothing observed it until here.
const submitted = (store: ReturnType<typeof makeStore>) => {
  const { entryDraft } = store.getState().game.general;
  return { ...entryDraft, id: "e1", seq: 0 };
};

const passesSchema = (store: ReturnType<typeof makeStore>) =>
  RecordRalliesSchema.safeParse([submitted(store)]).success;

// Everything the panel can offer for a home move: front row, back row, or --
// with no player picked -- an opponent error.
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
      // No away pick follows: the home move already fills both sides.
      const store = makeStore();
      store.dispatch(gameActions.setEntryDraftHomeMove(move));

      expect(passesSchema(store)).toBe(true);
    },
  );

  it("rejects the untouched draft, which is why the panel gates submission", () => {
    expect(passesSchema(makeStore())).toBe(false);
  });
});
