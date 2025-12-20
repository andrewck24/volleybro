import { injectable, inject } from "inversify";
import { TYPES } from "@/infrastructure/di/types";
import { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { Role } from "@/entities/team";
import { PlayerRole } from "@/entities/player";

@injectable()
export class AuthorizationService implements IAuthorizationService {
  constructor(
    @inject(TYPES.TeamRepository) private teamRepository: ITeamRepository,
    @inject(TYPES.PlayerRepository) private playerRepository: IPlayerRepository
  ) {}

  async verifyTeamRole(
    teamId: string,
    userId: string,
    role: Role = Role.MEMBER
  ): Promise<void> {
    const team = await this.teamRepository.findOne({ _id: teamId });
    if (!team) throw new Error("Team not found");

    const member = team.members.find(
      (member) => member.user_id.toString() === userId
    );
    if (!member) throw new Error("User not found in team");

    if (role === Role.MEMBER) return;
    if (role === Role.OWNER && member.role === Role.OWNER) return;
    if (role === Role.ADMIN && !!member.role) return;

    throw new Error(`User does not have role(${role}) privileges`);
  }

  /**
   * Verify user is admin or owner of the team
   */
  async verifyIsTeamAdmin(teamId: string, userId: string): Promise<void> {
    const player = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId
    );

    const isAdmin =
      player &&
      (player.role === PlayerRole.ADMIN || player.role === PlayerRole.OWNER);

    if (!isAdmin) {
      throw new Error("User is not admin of the team");
    }
  }

  /**
   * Verify user is owner of the team
   */
  async verifyIsTeamOwner(teamId: string, userId: string): Promise<void> {
    const owner = await this.playerRepository.findTeamOwner(teamId);

    if (!owner || owner.userId !== userId) {
      throw new Error("User is not owner of the team");
    }
  }

  /**
   * Verify user has specific player role in team
   */
  async verifyPlayerRole(
    teamId: string,
    userId: string,
    requiredRole: PlayerRole
  ): Promise<void> {
    const player = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId
    );

    if (!player || player.role !== requiredRole) {
      throw new Error(`User does not have role ${requiredRole} in team`);
    }
  }

  /**
   * Get player's role in a team
   */
  async getPlayerRole(
    teamId: string,
    userId: string
  ): Promise<PlayerRole | null> {
    const player = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId
    );

    return player?.role || null;
  }
}
