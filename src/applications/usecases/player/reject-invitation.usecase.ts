import { inject, injectable } from 'inversify';
import type { IRejectInvitationUseCase } from '@/applications/usecases/player/reject-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { TYPES } from '@/infrastructure/di/types';

/**
 * RejectInvitationUseCase Implementation
 * User rejects invitation - clears email but keeps player record as PURE_PLAYER
 *
 * Validates:
 * - Player record exists with pending invitation
 * - Player record has email set
 */
@injectable()
export class RejectInvitationUseCase implements IRejectInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository
  ) {}

  async execute(playerId: string, userId: string): Promise<void> {
    const player = await this.playerRepository.findById(playerId);

    if (!player) {
      throw new Error('Player record not found');
    }

    if (!player.email) {
      throw new Error('No invitation found for this player');
    }

    // Clear email to convert from INVITED to PURE_PLAYER status
    // Role is preserved as per business rules
    await this.playerRepository.update(playerId, {
      email: undefined,
    });
  }
}
