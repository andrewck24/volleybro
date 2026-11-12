export type EntryAction = "edit" | "delete" | "rollbackToHere";

export const isLatestEntry = (index: number, total: number): boolean =>
  total > 0 && index === total - 1;

export const composeEntryActions = (isLatest: boolean): EntryAction[] =>
  isLatest ? ["edit", "delete"] : ["edit", "rollbackToHere"];
