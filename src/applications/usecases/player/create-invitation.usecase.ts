import { inject, injectable } from 'inversify';
import type { ICreateInvitationUseCase } from '@/applications/usecases/player/create-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import { TYPES } from '@/infrastructure/di/types';
import { PlayerRole } from '@/entities/player';

/**
 * CreateInvitationUseCase Implementation
 * Team managers (ADMIN or OWNER) can invite users via email
 *
 * Validates:
 * - Creator is ADMIN or OWNER of the team
 * - Email is not already invited to this team
 * - Email is valid format
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
    teamId: string,
    email: string,
    role: string,
    createdBy: string
  ): Promise<string> {
    // Validate creator is admin or owner
    await this.authService.verifyIsTeamAdmin(teamId, createdBy);

    // Validate email format (basic)
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Validate role
    if (!Object.values(PlayerRole).includes(role as PlayerRole)) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Check if invitation already exists
    const existingInvitation = await this.playerRepository.findInvitedByTeamIdAndEmail(
      teamId,
      email
    );

    if (existingInvitation) {
      throw new Error('Invitation already exists for this email');
    }

    // Create invitation
    const player = await this.playerRepository.create({
      name: email.split('@')[0], // Default name from email
      teamId,
      email: email.toLowerCase(),
      role: role as PlayerRole,
    });

    return player._id;
  }
}
