import { matchPhaseHelper } from "@/lib/features/record/helpers";
import { type Record, EntryType, MoveType } from "@/entities/record";

describe("matchPhaseHelper", () => {
  test("should return in progress when no entries exist but first set is created", () => {
    const mockRecord = {
      sets: [{ entries: [] }],
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    } as unknown as Record;

    const result = matchPhaseHelper(mockRecord, 0, 0);

    expect(result).toEqual({ inProgress: true, isSetPoint: false });
  });

  test("should return game not started when no sets exist", () => {
    const mockRecord = {
      sets: [],
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    } as unknown as Record;

    const result = matchPhaseHelper(mockRecord, 0, 0);

    expect(result).toEqual({ inProgress: false, isSetPoint: false });
  });

  test("should indicate game in progress when both scores are below set point", () => {
    const mockRecord = {
      sets: [
        {
          entries: [
            {
              type: EntryType.RALLY,
                win: true,
                home: { score: 20, type: MoveType.SERVING, num: 1 },
                away: { score: 18, type: MoveType.RECEPTION, num: 1 },

            },
          ],
        },
      ],
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    } as unknown as Record;

    const result = matchPhaseHelper(mockRecord, 0, 1);

    expect(result).toEqual({ inProgress: true, isSetPoint: false });
  });

  test("should indicate set point when one team reaches 24 and leads", () => {
    const mockRecord = {
      sets: [
        {
          entries: [
            {
              type: EntryType.RALLY,
                win: true,
                home: { score: 24, type: MoveType.SERVING, num: 1 },
                away: { score: 22, type: MoveType.RECEPTION, num: 1 },

            },
          ],
        },
      ],
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    } as unknown as Record;

    const result = matchPhaseHelper(mockRecord, 0, 1);

    expect(result).toEqual({ inProgress: true, isSetPoint: true });
  });

  test("should indicate set point in deuce when scores are beyond 24", () => {
    const mockRecord = {
      sets: [
        {
          entries: [
            {
              type: EntryType.RALLY,
                win: true,
                home: { score: 26, type: MoveType.SERVING, num: 1 },
                away: { score: 25, type: MoveType.RECEPTION, num: 1 },

            },
          ],
        },
      ],
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    } as unknown as Record;

    const result = matchPhaseHelper(mockRecord, 0, 1);

    expect(result).toEqual({ inProgress: true, isSetPoint: true });
  });

  test("should indicate game over when one team wins by 2 points", () => {
    const mockRecord = {
      sets: [
        {
          entries: [
            {
              type: EntryType.RALLY,
                win: true,
                home: { score: 25, type: MoveType.SERVING, num: 1 },
                away: { score: 23, type: MoveType.RECEPTION, num: 1 },

            },
          ],
        },
      ],
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
    } as unknown as Record;

    const result = matchPhaseHelper(mockRecord, 0, 1);

    expect(result).toEqual({ inProgress: false, isSetPoint: false });
  });

  test("should use different winning points in deciding set", () => {
    const mockRecord = {
      sets: [
        ...Array(2).fill({ entries: [] }),
        {
          entries: [
            {
              type: EntryType.RALLY,
                win: true,
                home: { score: 14, type: MoveType.SERVING, num: 1 },
                away: { score: 12, type: MoveType.RECEPTION, num: 1 },

            },
          ],
        },
      ],
      info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
    } as unknown as Record;

    const result = matchPhaseHelper(mockRecord, 2, 1); // Last set (index 4)

    expect(result).toEqual({ inProgress: true, isSetPoint: true });
  });
});
