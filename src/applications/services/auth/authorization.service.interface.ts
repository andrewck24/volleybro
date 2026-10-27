import { PlayerRole, type TeamMember } from "@/entities/player";

export interface IAuthorizationService {
  verifyTeamRole(
    teamId: string,
    userId: string,
    role: PlayerRole,
  ): Promise<TeamMember>;

  /**
   * Verify user is admin or owner of the team
   */
  verifyIsTeamAdmin(teamId: string, userId: string): Promise<void>;
}
