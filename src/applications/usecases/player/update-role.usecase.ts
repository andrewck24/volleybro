import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { authorizeManagePlayer } from "@/applications/usecases/player/membership";
import {
  ConflictError,
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import type { Player, PlayerRole } from "@/entities/player";
import { PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IUpdateRoleInput {
  playerId: string;
  newRole: PlayerRole;
  userId: string;
}

export interface IUpdateRoleUseCase {
  execute(input: IUpdateRoleInput): Promise<Player>;
}

@injectable()
export class UpdateRoleUseCase implements IUpdateRoleUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
  ) {}

  async execute({
    playerId,
    newRole,
    userId,
  }: IUpdateRoleInput): Promise<Player> {
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

    // 只有受邀者與成員有角色
    if (player.status === PlayerStatus.NONE) {
      throw new ConflictError(
        PlayerReason.TARGET_NOT_LINKED,
        "An unlinked player has no role to change",
      );
    }

    const updatedPlayer = await this.playerRepository.update(playerId, {
      role: newRole,
    });

    if (!updatedPlayer) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to update player role",
      );
    }

    return updatedPlayer;
  }
}
