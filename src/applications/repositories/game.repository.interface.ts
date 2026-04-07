import type { Game, GameSummary } from "@/entities/game";

export interface IGameRepository {
  findById(id: string): Promise<Game | null>;
  create(data: Omit<Game, "id">): Promise<Game>;
  update(id: string, data: Partial<Game>): Promise<Game>;
  delete(id: string): Promise<boolean>;
  findGameSummaries(
    teamId: string,
    options?: { lastId?: string; limit?: number },
  ): Promise<{ data: GameSummary[]; hasMore: boolean; lastId: string }>;
}
