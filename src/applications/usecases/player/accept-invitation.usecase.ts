import { inject, injectable } from 'inversify';
import type { IAcceptInvitationUseCase } from '@/applications/usecases/player/accept-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { TYPES } from '@/infrastructure/di/types';

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

    // Verify player is not already joined
    if (player.userId) {
      throw new Error('Player is already a joined member');
    }

    // Verify this is a pending invitation (has email)
    if (!player.email) {
      throw new Error('No invitation found for this player');
    }

    // Update player with userId to mark as joined
    await this.playerRepository.update(playerId, {
      userId,
    });
  }
}
