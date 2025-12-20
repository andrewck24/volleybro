import { inject, injectable } from 'inversify';
import type { ICreateInvitationUseCase } from '@/applications/usecases/player/create-invitation.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import { TYPES } from '@/infrastructure/di/types';
import { PlayerRole } from '@/entities/player';
import { z } from 'zod';

/**
 * CreateInvitationUseCase Implementation
 * Team managers (ADMIN or OWNER) can invite users via email
 *
 * Validates:
 * - Creator is ADMIN or OWNER of the team
 * - Email is valid format (using Zod email validation)
 * - Email is not already invited to this team
 * - Role is valid (OWNER role can only be assigned by current OWNER)
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

    // T058: Validate email format using Zod (replaces basic string check)
    const validatedEmail = z.string().email('Invalid email format').parse(email);

    // Validate role
    if (!Object.values(PlayerRole).includes(role as PlayerRole)) {
      throw new Error(`Invalid role: ${role}`);
    }

    // T059: Protect OWNER role - only current OWNER can assign OWNER role
    if (role === PlayerRole.OWNER) {
      const creatorRole = await this.authService.getPlayerRole(teamId, createdBy);
      if (creatorRole !== PlayerRole.OWNER) {
        throw new Error('Only OWNER can assign OWNER role');
      }
    }

    // T061: Use findInvitedByTeamIdAndEmail directly (replaces existsInvitation pattern)
    const existingInvitation = await this.playerRepository.findInvitedByTeamIdAndEmail(
      teamId,
      validatedEmail
    );

    if (existingInvitation) {
      throw new Error('Invitation already exists for this email');
    }

    // Create invitation
    const player = await this.playerRepository.create({
      name: validatedEmail.split('@')[0], // Default name from email
      teamId,
      email: validatedEmail.toLowerCase(),
      role: role as PlayerRole,
    });

    return player._id;
  }
}
