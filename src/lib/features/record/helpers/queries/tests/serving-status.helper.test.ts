import { getServingStatus } from "@/lib/features/record/helpers";
import { type Set, EntryType, MoveType } from "@/entities/record";

describe("getServingStatus", () => {
  it("should return true when previous Rally was won", () => {
    const mockSet = {
      entries: [
        {
          type: EntryType.RALLY,
          data: {
            win: true,
            home: { score: 10, type: MoveType.SERVING, num: 1 },
            away: { score: 8, type: MoveType.RECEPTION, num: 1 },
          },
        },
      ],
    } as Set;

    const entryIndex = 1; // Look for rally before entryIndex

    const isServing = getServingStatus(mockSet, entryIndex);

    expect(isServing).toBe(true);
  });

  it("should return false when previous Rally was lost", () => {
    const mockSet = {
      entries: [
        {
          type: EntryType.RALLY,
          data: {
            win: false,
            home: { score: 8, type: MoveType.RECEPTION, num: 1 },
            away: { score: 10, type: MoveType.SERVING, num: 1 },
          },
        },
      ],
    } as Set;

    const entryIndex = 1;

    const isServing = getServingStatus(mockSet, entryIndex);

    expect(isServing).toBe(false);
  });

  it("should return initial serve setting when no previous Rally exists", () => {
    const mockSet = {
      options: { serve: "home" },
      entries: [
        {
          type: EntryType.TIMEOUT, // Non-RALLY type
          data: {},
        },
      ],
    } as Set;

    const entryIndex = 1;

    const isServing = getServingStatus(mockSet, entryIndex);

    expect(isServing).toBe(true);
  });

  it("should return initial serve setting when entryIndex is 0", () => {
    const mockSet = {
      options: { serve: "away" },
      entries: [],
    } as Set;

    const entryIndex = 0;

    const isServing = getServingStatus(mockSet, entryIndex);

    expect(isServing).toBe(false);
  });
});
