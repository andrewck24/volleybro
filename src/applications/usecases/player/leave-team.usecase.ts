import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ILeaveTeamUseCase } from './leave-team.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { ITeamRepository } from '@/applications/repositories/team.repository.interface';

@injectable()
export class LeaveTeamUseCase implements ILeaveTeamUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository
  ) {}

  async execute(
    playerId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    // 1. Get player to confirm exists and belongs to user
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // 2. Verify this player is linked to the current user
    if (player.userId !== userId) {
      throw new Error('User cannot leave this player record');
    }

    // 3. Update player to unlink userId (keep email for record)
    const updated = await this.playerRepository.update(playerId, {
      userId: undefined,
    });
    if (!updated) {
      throw new Error('Failed to leave team');
    }

    // 4. Remove player from team lineups
    await this.teamRepository.removePlayerFromLineups(player.teamId, playerId);

    return { success: true };
  }
}
