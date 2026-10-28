import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { authorizeManagePlayer } from "@/applications/usecases/player/membership";
import {
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
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
      this.teamRepository,
      player.teamId,
      player,
      userId,
    );

    // Lineups first: a failed delete leaves a player that can be removed again.
    await this.teamRepository.removePlayerFromLineups(player.teamId, playerId);

    const deleted = await this.playerRepository.delete(playerId);
    if (!deleted) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to delete player",
      );
    }

    return { success: true };
  }
}
