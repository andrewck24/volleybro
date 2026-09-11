import { getSetOptions } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";

const makeGame = (
  sets: {
    options: { serve: "home" | "away"; time?: { start: string; end: string } };
  }[],
): GameView => ({ sets }) as unknown as GameView;

const NOW = "18:30";

describe("getSetOptions", () => {
  it("returns the saved options for an existing set", () => {
    const game = makeGame([
      { options: { serve: "home", time: { start: "18:00", end: "18:25" } } },
    ]);
    expect(getSetOptions(game, 0, NOW)).toEqual({
      serve: "home",
      time: { start: "18:00", end: "18:25" },
    });
  });

  it("starts the first set with the opponent serving", () => {
    expect(getSetOptions(makeGame([]), 0, NOW)).toEqual({
      serve: "away",
      time: { start: NOW, end: "" },
    });
  });

  it("alternates the serve from the previous set for a new set", () => {
    expect(
      getSetOptions(makeGame([{ options: { serve: "home" } }]), 1, NOW).serve,
    ).toBe("away");
    expect(
      getSetOptions(makeGame([{ options: { serve: "away" } }]), 1, NOW).serve,
    ).toBe("home");
  });
});
