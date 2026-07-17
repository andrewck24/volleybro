/**
 * Last-entry rule (D12): action buttons are a pure function of whether an
 * entry is the latest one. The latest entry offers edit + delete; every
 * other entry offers edit + "roll back and re-record to here" -- never a
 * disabled delete button.
 */

export type EntryAction = "edit" | "delete" | "rollbackToHere";

/** Safe for an empty list or an out-of-bounds index: both resolve to false. */
export const isLatestEntry = (index: number, total: number): boolean =>
  total > 0 && index === total - 1;

export const composeEntryActions = (isLatest: boolean): EntryAction[] =>
  isLatest ? ["edit", "delete"] : ["edit", "rollbackToHere"];
