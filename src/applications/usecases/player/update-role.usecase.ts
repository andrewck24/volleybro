import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, UnexpectedError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { PlayerReason } from "@/entities/errors/reasons/player";
import type { Player, PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";
import type { IUpdateRoleUseCase } from "./update-role.usecase.interface";

@injectable()
export class UpdateRoleUseCase implements IUpdateRoleUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute(
    playerId: string,
    newRole: PlayerRole,
    userId: string,
  ): Promise<Player> {
    // 1. 取得球員，確認存在
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    // 2. 驗證權限 - 必須是該隊伍的 ADMIN 或 OWNER
    if (!player.teamId)
      throw new NotFoundError(PlayerReason.PLAYER_NOT_FOUND, "Player has no team");
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    // 3. 更新角色
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
