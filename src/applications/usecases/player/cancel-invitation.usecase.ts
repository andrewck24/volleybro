import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ICancelInvitationUseCase } from './cancel-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';
import { PlayerStatus } from '@/entities/player';

@injectable()
export class CancelInvitationUseCase implements ICancelInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(playerId: string, userId: string): Promise<Player> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    if (player.status !== PlayerStatus.INVITED) {
      throw new Error('Player is not an invited member');
    }

    const updated = await this.playerRepository.update(playerId, {
      status: PlayerStatus.NONE,
      email: undefined,
      userId: undefined,
    });

    if (!updated) {
      throw new Error('Failed to cancel invitation');
    }

    return updated;
  }
}
