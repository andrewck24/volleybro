import { PlayerRole, type TeamMember } from "@/entities/player";

export interface IAuthorizationService {
  verifyTeamRole(
    teamId: string,
    userId: string,
    role: PlayerRole,
  ): Promise<TeamMember>;

  verifyIsTeamAdmin(teamId: string, userId: string): Promise<void>;
}
