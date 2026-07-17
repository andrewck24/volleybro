import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import { type Player, type Position } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IUpdatePlayerInfoInput {
  playerId: string;
  updates: { name?: string; number?: number; position?: Position };
  userId: string;
}

export interface IUpdatePlayerInfoUseCase {
  execute(input: IUpdatePlayerInfoInput): Promise<Player>;
}

@injectable()
export class UpdatePlayerInfoUseCase implements IUpdatePlayerInfoUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute({
    playerId,
    updates,
    userId,
  }: IUpdatePlayerInfoInput): Promise<Player> {
    // 1. 取得球員，確認存在
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    // 2. 驗證權限 - 必須是該隊伍的 ADMIN 或 OWNER
    await this.authService.verifyIsTeamAdmin(player.teamId!, userId);

    // 3. 準備更新資料（只允許更新 name, number, position）
    const updateData: Partial<Player> = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.number !== undefined) {
      updateData.number = updates.number;
    }
    if (updates.position !== undefined) {
      updateData.position = updates.position;
    }

    // 4. 更新球員資訊
    const updatedPlayer = await this.playerRepository.update(
      playerId,
      updateData,
    );

    if (!updatedPlayer) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to update player info",
      );
    }

    return updatedPlayer;
  }
}
