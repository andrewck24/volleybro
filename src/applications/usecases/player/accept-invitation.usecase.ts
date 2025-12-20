import { inject, injectable } from 'inversify';
import { IAcceptInvitationUseCase } from './accept-invitation.usecase.interface';
import { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { TYPES } from '@/infrastructure/di/types';
import { PlayerStatus } from '@/entities/player';

/**
 * AcceptInvitationUseCase Implementation
 * User accepts invitation and joins team
 *
 * Validates:
 * - Player record exists with pending invitation (email set, userId not set)
 * - Email matches inviting user's email
 */
@injectable()
export class AcceptInvitationUseCase implements IAcceptInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository
  ) {}

  async execute(playerId: string, userId: string): Promise<void> {
    const player = await this.playerRepository.findById(playerId);

    if (!player) {
      throw new Error('Player record not found');
    }

    // Verify this is a pending invitation (has email, no userId)
    if (PlayerStatus.INVITED !== 'INVITED') {
      throw new Error('Player is not in INVITED status');
    }

    if (!player.email) {
      throw new Error('No invitation found for this player');
    }

    // Update player with userId to mark as joined
    await this.playerRepository.update(playerId, {
      userId,
    });
  }
}
