import type { Lineup, Team } from "@/entities/team";

export interface ITeamRepository {
  findById(id: string): Promise<Team | null>;
  transferOwnership(
    teamId: string,
    fromPlayerId: string,
    toPlayerId: string,
  ): Promise<Team | null>;
  create(data: Omit<Team, "id" | "createdAt" | "updatedAt">): Promise<Team>;
  update(id: string, updates: Partial<Team>): Promise<Team>;
  updateLineups(teamId: string, lineups: Lineup[]): Promise<Lineup[]>;
  removeNonOwnerFromLineups(teamId: string, playerId: string): Promise<boolean>;
}
