import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { IRemovePlayerUseCase } from './remove-player.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';

@injectable()
export class RemovePlayerUseCase implements IRemovePlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(
    playerId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    // 1. Get player
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // 2. Verify user is admin of team
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    // 3. Delete player record
    const deleted = await this.playerRepository.delete(playerId);
    if (!deleted) {
      throw new Error('Failed to delete player');
    }

    return { success: true };
  }
}
