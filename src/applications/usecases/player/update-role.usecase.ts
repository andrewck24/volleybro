import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { IUpdateRoleUseCase } from './update-role.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';
import type { PlayerRole } from '@/entities/player';

@injectable()
export class UpdateRoleUseCase implements IUpdateRoleUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(
    playerId: string,
    newRole: PlayerRole,
    userId: string
  ): Promise<Player> {
    // 1. 取得球員，確認存在
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // 2. 驗證權限 - 必須是該隊伍的 ADMIN 或 OWNER
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    // 3. 更新角色
    const updatedPlayer = await this.playerRepository.update(playerId, {
      role: newRole,
    });

    if (!updatedPlayer) {
      throw new Error('Failed to update player role');
    }

    return updatedPlayer;
  }
}
