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
  addSet(
    ref: EntryRef,
    set: Set,
    options?: { clearTeamLineup?: boolean },
  ): Promise<Game>;
  updateSet(
    ref: EntryRef,
    changes: { options: Set["options"]; lineup?: Lineup },
  ): Promise<Game>;
  upsertEntries(
    ref: EntryRef,
    writes: EntryWrite[],
    operator: string,
  ): Promise<Entry[]>;
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
