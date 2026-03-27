import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  ConflictError,
  NotFoundError,
  UnexpectedError,
} from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { PlayerReason } from "@/entities/errors/reasons/player";
import type { Player } from "@/entities/player";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";
import type { ICreateInvitationUseCase } from "./create-invitation.usecase.interface";

/**
 * CreateInvitationUseCase - Invite a NONE player: status NONE → INVITED
 */
@injectable()
export class CreateInvitationUseCase implements ICreateInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute(
    playerId: string,
    email: string,
    role: PlayerRole,
    userId: string,
  ): Promise<Player> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    if (player.status === PlayerStatus.INVITED) {
      throw new ConflictError(
        PlayerReason.ALREADY_INVITED,
        "Player already has a pending invitation",
      );
    }
    if (player.status === PlayerStatus.JOINED) {
      throw new ConflictError(
        PlayerReason.ALREADY_MEMBER,
        "Player is already a member of this team",
      );
    }

    await this.authService.verifyIsTeamAdmin(player.teamId!, userId);

    const updated = await this.playerRepository.update(playerId, {
      status: PlayerStatus.INVITED,
      email,
      role,
    });

    if (!updated) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to create invitation",
      );
    }

    return updated;
  }
}
