import { ValidationError } from "@/entities/errors";
import { MoveType, validateRallyEntry } from "@/entities/game";
import { scoringMoves } from "@/lib/scoring-moves";

const rallyWithNum = (num: number) =>
  ({
    id: "e1",
    seq: 0,
    win: true,
    home: { score: 1, type: MoveType.ATTACK, num },
    away: { score: 0, type: MoveType.DEFENSE, num: 7 },
  }) as unknown as Parameters<typeof validateRallyEntry>[0];

describe("scoringMoves", () => {
  // The validator carries its own copy of this table's last index, because
  // entities cannot import from here. Adding a move without widening that
  // bound would have the validator reject the new move and nothing else fail.
  it("ends where the rally validator's accepted range ends", () => {
    const last = scoringMoves.at(-1)!.num;

    expect(() => validateRallyEntry(rallyWithNum(last))).not.toThrow();
    expect(() => validateRallyEntry(rallyWithNum(last + 1))).toThrow(
      ValidationError,
    );
  });

  it("indexes itself by num, which is what the validator's range assumes", () => {
    scoringMoves.forEach((move, index) => expect(move.num).toBe(index));
  });
});
