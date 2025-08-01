import { getPreviousScores } from "@/lib/features/record/helpers";
import { type Entry, EntryType, MoveType, Side } from "@/entities/record";

describe("getPreviousScores", () => {
  it("should return correct scores when previous Rally exists", () => {
    const mockEntries: Entry[] = [
      {
        type: EntryType.RALLY,
        data: {
          win: true,
          home: { score: 10, type: MoveType.SERVING, num: 1 },
          away: { score: 8, type: MoveType.RECEPTION, num: 1 },
        },
      },
    ];

    const entryIndex = 1; // Look for rally before entryIndex

    const scores = getPreviousScores(mockEntries, entryIndex);

    expect(scores).toEqual({ home: 10, away: 8 });
  });

  it("should return zero scores when no previous Rally exists", () => {
    // Create Record object without Rally
    const mockEntries: Entry[] = [
      {
        type: EntryType.TIMEOUT, // Non-RALLY type
        data: { team: Side.HOME },
      },
    ];

    const entryIndex = 1;

    const scores = getPreviousScores(mockEntries, entryIndex);

    expect(scores).toEqual({ home: 0, away: 0 });
  });

  it("should return zero scores when entryIndex is 0", () => {
    const mockEntries: Entry[] = [];

    const entryIndex = 0; // No previous entry

    const scores = getPreviousScores(mockEntries, entryIndex);

    expect(scores).toEqual({ home: 0, away: 0 });
  });

  it("should get scores from most recent Rally when multiple entries exist", () => {
    const mockEntries: Entry[] = [
      {
        type: EntryType.RALLY,
        data: {
          win: true,
          home: { score: 15, type: MoveType.SERVING, num: 1 },
          away: { score: 15, type: MoveType.RECEPTION, num: 1 },
        },
      },
      {
        type: EntryType.TIMEOUT,
        data: { team: Side.HOME },
      },
      {
        type: EntryType.RALLY,
        data: {
          win: false,
          home: { score: 15, type: MoveType.ATTACK, num: 2 },
          away: { score: 16, type: MoveType.BLOCKING, num: 2 },
        },
      },
    ];

    const entryIndex = 3; // Look for rally before entryIndex=3

    const scores = getPreviousScores(mockEntries, entryIndex);

    expect(scores).toEqual({ home: 15, away: 16 });
  });
});
