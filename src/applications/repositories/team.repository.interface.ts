import type { Team } from "@/entities/team";

export interface ITeamRepository {
  findById(id: string): Promise<Team | null>;
  create(data: Omit<Team, "id" | "createdAt" | "updatedAt">): Promise<Team>;
  update(id: string, updates: Partial<Team>): Promise<Team | null>;
  delete(id: string): Promise<boolean>;
  removePlayerFromLineups(teamId: string, playerId: string): Promise<void>;
}
