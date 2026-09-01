import setCompletionReducer, {
  readSetCompletion,
  setCompletionActions,
} from "@/lib/features/game/set-completion-slice";

describe("setCompletion reducer", () => {
  it("has no recorded signal for a set that has not been reported yet", () => {
    const state = setCompletionReducer(undefined, { type: "@@INIT" });
    expect(readSetCompletion(state, "game-1", 0)).toBeUndefined();
  });

  it("records a confirmed submit-time result", () => {
    const state = setCompletionReducer(
      undefined,
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: true,
      }),
    );
    expect(readSetCompletion(state, "game-1", 0)).toBe(true);
  });

  it("records an unconfirmed submit-time result separately per set", () => {
    let state = setCompletionReducer(
      undefined,
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );
    state = setCompletionReducer(
      state,
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 1,
        confirmed: true,
      }),
    );

    expect(readSetCompletion(state, "game-1", 0)).toBe(false);
    expect(readSetCompletion(state, "game-1", 1)).toBe(true);
  });

  it("a later result overwrites an earlier one for the same set", () => {
    let state = setCompletionReducer(
      undefined,
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: false,
      }),
    );
    state = setCompletionReducer(
      state,
      setCompletionActions.recorded({
        gameId: "game-1",
        setIndex: 0,
        confirmed: true,
      }),
    );

    expect(readSetCompletion(state, "game-1", 0)).toBe(true);
  });
});
