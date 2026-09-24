import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import {
  authorizeManagePlayer,
  clearActiveTeam,
} from "@/applications/usecases/player/membership";
import {
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import { isTeamMember } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IRemovePlayerInput {
  playerId: string;
  userId: string;
}

export interface IRemovePlayerUseCase {
  execute(input: IRemovePlayerInput): Promise<{ success: boolean }>;
}

@injectable()
export class RemovePlayerUseCase implements IRemovePlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute({
    playerId,
    userId,
  }: IRemovePlayerInput): Promise<{ success: boolean }> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    if (!player.teamId)
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player has no team",
      );
    await authorizeManagePlayer(
      this.playerRepository,
      player.teamId,
      player,
      userId,
    );

    const deleted = await this.playerRepository.delete(playerId);
    if (!deleted) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to delete player",
      );
    }

    await this.teamRepository.removePlayerFromLineups(player.teamId, playerId);

    if (isTeamMember(player))
      await clearActiveTeam(
        this.profileRepository,
        player.userId,
        player.teamId,
      );

    return { success: true };
  }
}
