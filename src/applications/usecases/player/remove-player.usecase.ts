import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, UnexpectedError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { PlayerReason } from "@/entities/errors/reasons/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";
import type { IRemovePlayerUseCase } from "./remove-player.usecase.interface";

@injectable()
export class RemovePlayerUseCase implements IRemovePlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
  ) {}

  async execute(
    playerId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    // 1. Get player
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    // 2. Verify user is admin of team
    if (!player.teamId)
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player has no team",
      );
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    // 3. Delete player
    const deleted = await this.playerRepository.delete(playerId);
    if (!deleted) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to delete player",
      );
    }

    // 4. Remove player from team lineups
    await this.teamRepository.removePlayerFromLineups(player.teamId, playerId);

    return { success: true };
  }
}
