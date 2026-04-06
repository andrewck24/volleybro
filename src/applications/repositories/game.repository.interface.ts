import type { IBaseRepository } from "@/applications/repositories/base.repository.interface";
import type { Game, GameSummary } from "@/entities/game";

export interface IGameRepository extends IBaseRepository<Game> {
  findMatchesWithPagination(
    filter: { $and?: unknown[]; [key: string]: unknown },
    options: {
      lastId?: string;
      limit?: number;
      sortField?: string;
      sortDirection?: 1 | -1;
    },
  ): Promise<{ data: GameSummary[]; hasMore: boolean; lastId: string }>;
}
