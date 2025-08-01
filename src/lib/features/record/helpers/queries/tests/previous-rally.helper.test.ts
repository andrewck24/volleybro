import { getPreviousRally } from "@/lib/features/record/helpers";
import {
  type Entry,
  type Rally,
  type Substitution,
  type Timeout,
  EntryType,
  Side,
  MoveType,
} from "@/entities/record";

describe("getPreviousRally", () => {
  // Create basic test Record object
  const mockRally1: Rally = {
    win: true,
    home: { score: 1, type: MoveType.ATTACK, num: 1 },
    away: { score: 0, type: MoveType.DEFENSE, num: 1 },
  };

  const mockRally2: Rally = {
    win: false,
    home: { score: 1, type: MoveType.SERVING, num: 2 },
    away: { score: 1, type: MoveType.RECEPTION, num: 2 },
  };

  const mockSubstitution: Substitution = {
    team: Side.HOME,
    players: { in: "player2", out: "player1" },
  };

  const mockTimeout: Timeout = {
    team: Side.AWAY,
  };

  const mockEntries: Entry[] = [
    { type: EntryType.RALLY, data: mockRally1 },
    { type: EntryType.SUBSTITUTION, data: mockSubstitution },
    { type: EntryType.TIMEOUT, data: mockTimeout },
    { type: EntryType.RALLY, data: mockRally2 },
  ];

  beforeEach(() => jest.clearAllMocks());

  it("should return null when entryIndex <= 0", () => {
    const result = getPreviousRally(mockEntries, 0);
    expect(result).toBeNull();

    const resultNegative = getPreviousRally(mockEntries, -1);
    expect(resultNegative).toBeNull();
  });

  it("should return null when there's no RALLY entry before the specified entryIndex", () => {
    // Create test data with only substitution and timeout
    const noRallyEntries: Entry[] = [
      { type: EntryType.SUBSTITUTION, data: mockSubstitution },
      { type: EntryType.TIMEOUT, data: mockTimeout },
    ];

    const result = getPreviousRally(noRallyEntries, 2);
    expect(result).toBeNull();
  });

  it("should return the most recent RALLY before the specified entryIndex", () => {
    // Before index 3, the most recent RALLY is mockRally1 at index 0
    const result = getPreviousRally(mockEntries, 3);
    expect(result).toEqual(mockRally1);
  });

  it("should return the previous RALLY when there are multiple non-RALLY entries", () => {
    // Before index 3, there are two non-RALLY entries, then one RALLY
    const result = getPreviousRally(mockEntries, 4);
    expect(result).toEqual(mockRally2);
  });
});
