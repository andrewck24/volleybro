import type { Lineup, Team } from "@/entities/team";

export interface ITeamRepository {
  findById(id: string): Promise<Team | null>;
  create(data: Omit<Team, "id" | "createdAt" | "updatedAt">): Promise<Team>;
  update(id: string, updates: Partial<Team>): Promise<Team>;
  delete(id: string): Promise<void>;
  updateLineups(teamId: string, lineups: Lineup[]): Promise<Lineup[]>;
  removePlayerFromLineups(teamId: string, playerId: string): Promise<void>;
}
