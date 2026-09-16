import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { hasTeamRole, isTeamMember, PlayerRole } from "@/entities/player";
import { AuthorizationError, AuthReason } from "@/entities/errors";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

const notTeamMember = () =>
  new AuthorizationError(
    AuthReason.NOT_TEAM_MEMBER,
    "User is not a member of this team",
  );

const insufficientRole = () =>
  new AuthorizationError(
    AuthReason.INSUFFICIENT_ROLE,
    "Insufficient permissions for this action",
  );

@injectable()
export class AuthorizationService implements IAuthorizationService {
  constructor(
    @inject(TYPES.PlayerRepository) private playerRepository: IPlayerRepository,
  ) {}

  async verifyTeamRole(
    teamId: string,
    userId: string,
    role: PlayerRole = PlayerRole.MEMBER,
  ): Promise<void> {
    const player = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId,
    );

    if (!player || !isTeamMember(player)) throw notTeamMember();
    if (!hasTeamRole(player, role)) throw insufficientRole();
  }

  /**
   * Verify user is admin or owner of the team
   */
  async verifyIsTeamAdmin(teamId: string, userId: string): Promise<void> {
    await this.verifyTeamRole(teamId, userId, PlayerRole.ADMIN);
  }
}
