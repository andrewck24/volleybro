import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ICreateInvitationUseCase } from './create-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';
import { PlayerRole } from '@/entities/player';

/**
 * CreateInvitationUseCase - Invite an existing PURE_PLAYER to the team
 *
 * Adds an email to a PURE_PLAYER record, transitioning the player
 * from PURE_PLAYER to INVITED status.
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
    // 1. Get player record
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // 2. Verify player is PURE_PLAYER (no email, no userId)
    if (player.email) {
      throw new Error('Player already has an invitation');
    }
    if (player.userId) {
      throw new Error('Player is already a joined member');
    }

    // 3. Verify user is admin/owner of the team
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    // 4. Update player with email and role
    const updated = await this.playerRepository.update(playerId, {
      email,
      role,
    });

    if (!updated) {
      throw new Error('Failed to create invitation');
    }

    return updated;
  }
}
