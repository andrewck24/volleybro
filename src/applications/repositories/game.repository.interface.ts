import type {
  Entry,
  EntryWrite,
  Game,
  GameSummary,
  Set,
} from "@/entities/game";
import type { Lineup } from "@/entities/team";

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
   * Replaces a set's options and, when given, its home starting lineup,
   * leaving every other field — entries included — as stored. The current
   * lineups are recomputed from the entries the set holds at write time; a
   * starting lineup that invalidates one is refused with INVALID_SUBSTITUTION.
   */
  updateSet(
    ref: EntryRef,
    changes: { options: Set["options"]; lineup?: Lineup },
  ): Promise<Game>;
  /**
   * Writes each entry by identity and returns the set's entries in sequence
   * order, regardless of arrival order. Whether an entry exists is decided
   * before anything is written:
   * - absent: created, recorded by `operator` at the write's `at`;
   * - present, `at` equal to its `recordedAt` and `operator` its `recordedBy`:
   *   a resend of the creation, so nothing is written;
   * - otherwise an edit: the content is replaced and `editedBy`/`editedAt`
   *   set; `recordedBy` and `recordedAt` never change.
   * The set's current lineups are recomputed from its starting lineups and
   * the entries it will hold, and written with the last entry. A write that leaves a
   * substitution invalid is refused whole with INVALID_SUBSTITUTION.
   */
  upsertEntry(
    ref: EntryRef,
    writes: EntryWrite[],
    operator: string,
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
  findGameSummaries(
    teamId: string,
    options?: { lastId?: string; limit?: number },
  ): Promise<{ data: GameSummary[]; hasMore: boolean; lastId: string }>;
}
