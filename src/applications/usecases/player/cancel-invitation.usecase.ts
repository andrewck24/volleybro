import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ICancelInvitationUseCase } from './cancel-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';

@injectable()
export class CancelInvitationUseCase implements ICancelInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(playerId: string, userId: string): Promise<Player> {
    // 1. Get the player to check if invitation exists
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // 2. Verify user is admin of the team
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    // 3. Check if player has an email (invitation status)
    if (!player.email) {
      throw new Error('Player is not an invited member');
    }

    // 4. Cancel invitation by removing email
    const updated = await this.playerRepository.update(playerId, {
      email: undefined,
    });

    if (!updated) {
      throw new Error('Failed to cancel invitation');
    }

    return updated;
  }
}
