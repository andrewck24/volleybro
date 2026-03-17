import { inject, injectable } from 'inversify';
import type { IAcceptInvitationUseCase } from '@/applications/usecases/player/accept-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { PlayerStatus } from '@/entities/player';
import { TYPES } from '@/infrastructure/di/types';

/**
 * AcceptInvitationUseCase Implementation
 * User accepts invitation: status INVITED → JOINED, sets userId, clears email
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

    if (player.status === PlayerStatus.JOINED) {
      throw new Error('Player is already a joined member');
    }

    if (player.status !== PlayerStatus.INVITED) {
      throw new Error('No invitation found for this player');
    }

    if (player.userId !== userId) {
      throw new Error('User is not the invited recipient');
    }

    await this.playerRepository.update(playerId, {
      status: PlayerStatus.JOINED,
      userId,
      email: undefined,
    });
  }
}
