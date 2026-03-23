import type { Record as RecordEntity, MatchResult } from "@/entities/record";
import type { IBaseRepository } from "@/applications/repositories/base.repository.interface";

export interface IRecordRepository extends IBaseRepository<RecordEntity> {
  findMatchesWithPagination(
    filter: { $and?: unknown[]; [key: string]: unknown },
    options: {
      lastId?: string;
      limit?: number;
      sortField?: string;
      sortDirection?: 1 | -1;
    }
  ): Promise<{ data: MatchResult[]; hasMore: boolean; lastId: string }>;
}
