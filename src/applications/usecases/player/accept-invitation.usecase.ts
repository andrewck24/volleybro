import { inject, injectable } from 'inversify';
import type { IAcceptInvitationUseCase } from '@/applications/usecases/player/accept-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { PlayerStatus } from '@/entities/player';
import { TYPES } from '@/infrastructure/di/types';
import { NotFoundError, ConflictError, AuthorizationError } from '@/entities/errors/app-error';
import { PlayerReason } from '@/entities/errors/reasons/player';

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
      throw new NotFoundError(PlayerReason.PLAYER_NOT_FOUND, 'Player not found');
    }

    if (player.status === PlayerStatus.JOINED) {
      throw new ConflictError(PlayerReason.ALREADY_MEMBER, 'Player is already a member of this team');
    }

    if (player.status !== PlayerStatus.INVITED) {
      throw new NotFoundError(PlayerReason.NOT_INVITED, 'No pending invitation found for this player');
    }

    if (player.userId !== userId) {
      throw new AuthorizationError(PlayerReason.NOT_RECIPIENT, 'You are not the invited recipient');
    }

    await this.playerRepository.update(playerId, {
      status: PlayerStatus.JOINED,
      userId,
      email: undefined,
    });
  }
}
