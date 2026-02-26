import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ICreateInvitationUseCase } from './create-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';
import { PlayerRole, PlayerStatus } from '@/entities/player';

/**
 * CreateInvitationUseCase - Invite a NONE player: status NONE → INVITED
 */
@injectable()
export class CreateInvitationUseCase implements ICreateInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(
    playerId: string,
    email: string,
    role: PlayerRole,
    userId: string
  ): Promise<Player> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.status === PlayerStatus.INVITED) {
      throw new Error('Player already has an invitation');
    }
    if (player.status === PlayerStatus.JOINED) {
      throw new Error('Player is already a joined member');
    }

    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    const updated = await this.playerRepository.update(playerId, {
      status: PlayerStatus.INVITED,
      email,
      role,
    });

    if (!updated) {
      throw new Error('Failed to create invitation');
    }

    return updated;
  }
}
