import type { Entry, Game, GameSummary, Set } from "@/entities/game";

export interface EntryRef {
  gameId: string;
  setIndex: number;
}

export interface IGameRepository {
  findById(id: string): Promise<Game | null>;
  create(data: Omit<Game, "id">): Promise<Game>;
  /**
   * Serves set-level writes only. It overwrites the whole document, so new
   * write paths must not use it — add a domain operation instead.
   */
  update(id: string, data: Partial<Game>): Promise<Game>;
  /**
   * Writes or overwrites each entry by identity and returns the set's
   * entries in sequence order, regardless of arrival order. A substitution
   * also changes who is on court, so the lineup the entry produces is
   * written with it rather than after it.
   */
  upsertEntry(
    ref: EntryRef,
    entries: Entry[],
    lineups?: Partial<Set["lineups"]>,
  ): Promise<Entry[]>;
  /**
   * Records a set's result, and the match's when the match is decided. Both
   * are derived values with no other writer, so they are written at the point
   * the derivation changes rather than accumulated per rally.
   */
  completeSet(
    ref: EntryRef,
    win: boolean | null,
    gameWin?: boolean | null,
  ): Promise<void>;
  delete(id: string): Promise<boolean>;
  findGameSummaries(
    teamId: string,
    options?: { lastId?: string; limit?: number },
  ): Promise<{ data: GameSummary[]; hasMore: boolean; lastId: string }>;
}
