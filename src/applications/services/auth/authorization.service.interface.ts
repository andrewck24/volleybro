import { PlayerRole } from "@/entities/player";

export interface IAuthorizationService {
  verifyTeamRole(
    teamId: string,
    userId: string,
    role: PlayerRole,
  ): Promise<void>;

  /**
   * Verify user is admin or owner of the team
   */
  verifyIsTeamAdmin(teamId: string, userId: string): Promise<void>;
}
