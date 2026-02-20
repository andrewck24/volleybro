import type { Player, PlayerRole } from '@/entities/player';

/**
 * ICreateInvitationUseCase - Invite an existing PURE_PLAYER to the team
 *
 * Adds an email to a PURE_PLAYER, transitioning them to INVITED status.
 * Only ADMIN or OWNER can create invitations.
 *
 * Preconditions:
 * - Player must exist and be a PURE_PLAYER (no email, no userId)
 * - Requesting user must be ADMIN or OWNER of the team
 *
 * @param playerId - The ID of the PURE_PLAYER to invite
 * @param email - The email to send the invitation to
 * @param role - The role to assign (MEMBER or ADMIN)
 * @param userId - The ID of the requesting user (must be ADMIN/OWNER)
 * @returns The updated player with email set (now INVITED status)
 */
export interface ICreateInvitationUseCase {
  execute(
    playerId: string,
    email: string,
    role: PlayerRole,
    userId: string
  ): Promise<Player>;
}
