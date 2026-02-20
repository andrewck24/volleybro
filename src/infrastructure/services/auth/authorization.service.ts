import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { PlayerRole } from "@/entities/player";
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
    if (!player) throw new Error("User not found in team");

    if (role === PlayerRole.MEMBER && player.role) return;
    if (role === PlayerRole.ADMIN && (player.role === PlayerRole.ADMIN || player.role === PlayerRole.OWNER)) return;
    if (role === PlayerRole.OWNER && player.role === PlayerRole.OWNER) return;

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
