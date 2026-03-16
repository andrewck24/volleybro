import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ILeaveTeamUseCase } from './leave-team.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { ITeamRepository } from '@/applications/repositories/team.repository.interface';
import type { IProfileRepository } from '@/applications/repositories/profile.repository.interface';
import { PlayerRole, PlayerStatus } from '@/entities/player';

@injectable()
export class LeaveTeamUseCase implements ILeaveTeamUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository
  ) {}

  async execute(
    playerId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.userId !== userId) {
      throw new Error('User cannot leave this player record');
    }

    if (player.role === PlayerRole.OWNER) {
      throw new Error('Owner cannot leave the team');
    }

    const updated = await this.playerRepository.update(playerId, {
      status: PlayerStatus.NONE,
      userId: undefined,
    });
    if (!updated) {
      throw new Error('Failed to leave team');
    }

    await this.teamRepository.removePlayerFromLineups(player.teamId, playerId);

    // Clear activeTeamId if it points to the team the user just left
    const profile = await this.profileRepository.findByUserId(userId);
    if (profile?.activeTeamId === player.teamId) {
      await this.profileRepository.updateActiveTeamId(userId, null);
    }

    return { success: true };
  }
}
