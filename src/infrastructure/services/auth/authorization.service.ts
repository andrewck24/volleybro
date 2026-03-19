import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { PlayerRole } from "@/entities/player";
import { AuthorizationError } from "@/entities/errors/app-error";
import { AuthReason } from "@/entities/errors/reasons/auth";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

@injectable()
export class AuthorizationService implements IAuthorizationService {
  constructor(
    @inject(TYPES.PlayerRepository) private playerRepository: IPlayerRepository
  ) {}

  async verifyTeamRole(
    teamId: string,
    userId: string,
    role: PlayerRole = PlayerRole.MEMBER
  ): Promise<void> {
    const player = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId
    );
    if (!player) throw new AuthorizationError(AuthReason.NOT_TEAM_MEMBER, "User is not a member of this team");

    if (role === PlayerRole.MEMBER && player.role) return;
    if (role === PlayerRole.ADMIN && (player.role === PlayerRole.ADMIN || player.role === PlayerRole.OWNER)) return;
    if (role === PlayerRole.OWNER && player.role === PlayerRole.OWNER) return;

    throw new AuthorizationError(AuthReason.INSUFFICIENT_ROLE, "Insufficient permissions for this action");
  }

  /**
   * Verify user is admin or owner of the team
   */
  async verifyIsTeamAdmin(teamId: string, userId: string): Promise<void> {
    const player = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId
    );

    if (!player) {
      throw new AuthorizationError(AuthReason.NOT_TEAM_MEMBER, "User is not a member of this team");
    }

    const isAdmin = player.role === PlayerRole.ADMIN || player.role === PlayerRole.OWNER;
    if (!isAdmin) {
      throw new AuthorizationError(AuthReason.INSUFFICIENT_ROLE, "Insufficient permissions for this action");
    }
  }

  /**
   * Verify user is owner of the team
   */
  async verifyIsTeamOwner(teamId: string, userId: string): Promise<void> {
    const owner = await this.playerRepository.findTeamOwner(teamId);

    if (!owner) {
      throw new AuthorizationError(AuthReason.NOT_TEAM_MEMBER, "User is not a member of this team");
    }
    if (owner.userId !== userId) {
      throw new AuthorizationError(AuthReason.INSUFFICIENT_ROLE, "Insufficient permissions for this action");
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
      throw new AuthorizationError(AuthReason.INSUFFICIENT_ROLE, "Insufficient permissions for this action");
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
