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
import { PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";
import type { ICancelInvitationUseCase } from "./cancel-invitation.usecase.interface";

@injectable()
export class CancelInvitationUseCase implements ICancelInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute(playerId: string, userId: string): Promise<Player> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    if (!player.teamId)
      throw new NotFoundError(PlayerReason.PLAYER_NOT_FOUND, "Player has no team");
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    if (player.status !== PlayerStatus.INVITED) {
      throw new ConflictError(
        PlayerReason.NOT_INVITED,
        "Player does not have a pending invitation",
      );
    }

    const updated = await this.playerRepository.update(playerId, {
      status: PlayerStatus.NONE,
      email: undefined,
      userId: undefined,
    });

    if (!updated) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to cancel invitation",
      );
    }

    return updated;
  }
}
