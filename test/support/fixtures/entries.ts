import {
  EntryType,
  MoveType,
  Side,
  type Entry,
  type RallyEntry,
  type EntryRecord,
  type SubstitutionEntry,
} from "@/entities/game";
import type { EntryView } from "@/lib/features/game/types";

/** An entry as the API returns it: JSON-serialised, so dates are ISO strings. */
export function toEntryView(entry: Entry): EntryView {
  return JSON.parse(JSON.stringify(entry)) as EntryView;
}

/** A valid ObjectId, so a stored entry's `recordedBy` casts. */
export const FIXTURE_RECORDER_ID = "64b0000000000000000000a1";

const recorded: EntryRecord = {
  recordedBy: FIXTURE_RECORDER_ID,
  recordedAt: new Date("2026-01-01T10:00:00.000Z"),
};

type Overrides<T> = Partial<T> & Partial<EntryRecord>;

/** A rally entry as stored: content plus who recorded it and when. */
export function createRecordedRally(
  overrides: Overrides<RallyEntry> = {},
): Entry & RallyEntry {
  return {
    type: EntryType.RALLY,
    id: "entry-1",
    seq: 0,
    win: true,
    home: { score: 1, type: MoveType.ATTACK, num: 0 },
    away: { score: 0, type: MoveType.ATTACK, num: 0 },
    ...recorded,
    ...overrides,
  };
}

/** A substitution entry as stored: content plus who recorded it and when. */
export function createRecordedSubstitution(
  overrides: Overrides<SubstitutionEntry> = {},
): Entry & SubstitutionEntry {
  return {
    type: EntryType.SUBSTITUTION,
    id: "entry-sub-1",
    seq: 1,
    team: Side.HOME,
    players: {
      in: "64b0000000000000000000a2",
      out: "64b0000000000000000000a3",
    },
    ...recorded,
    ...overrides,
  };
}
