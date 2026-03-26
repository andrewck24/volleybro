import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import {
  AuthorizationError,
  NotFoundError,
  UnexpectedError,
} from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { PlayerReason } from "@/entities/errors/reasons/player";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";
import type { ILeaveTeamUseCase } from "./leave-team.usecase.interface";

@injectable()
export class LeaveTeamUseCase implements ILeaveTeamUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute(
    playerId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    if (player.userId !== userId) {
      throw new AuthorizationError(
        PlayerReason.CANNOT_LEAVE_OWN_RECORD,
        "You cannot leave a player record that does not belong to you",
      );
    }

    if (player.role === PlayerRole.OWNER) {
      throw new AuthorizationError(
        PlayerReason.OWNER_CANNOT_LEAVE,
        "Team owner cannot leave the team",
      );
    }

    const updated = await this.playerRepository.update(playerId, {
      status: PlayerStatus.NONE,
      userId: undefined,
    });
    if (!updated) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to leave team",
      );
    }

    await this.teamRepository.removePlayerFromLineups(player.teamId!, playerId);

    // Clear activeTeamId if it points to the team the user just left
    const profile = await this.profileRepository.findByUserId(userId);
    if (profile?.activeTeamId === player.teamId) {
      await this.profileRepository.updateActiveTeamId(userId, null);
    }

    return { success: true };
  }
}
