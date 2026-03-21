import { PlayerRole } from "@/entities/player";

export interface IAuthorizationService {
  verifyTeamRole(teamId: string, userId: string, role: PlayerRole): Promise<void>;

  /**
   * Verify user is admin or owner of the team
   */
  verifyIsTeamAdmin(teamId: string, userId: string): Promise<void>;

  /**
   * Verify user is owner of the team
   */
  verifyIsTeamOwner(teamId: string, userId: string): Promise<void>;

  /**
   * Verify user has specific player role in team
   */
  verifyPlayerRole(
    teamId: string,
    userId: string,
    role: PlayerRole
  ): Promise<void>;

  /**
   * Get player's role in a team
   */
  getPlayerRole(teamId: string, userId: string): Promise<PlayerRole | null>;
}
