import type { Player } from '@/entities/player';

export interface ICancelInvitationUseCase {
  /**
   * Cancel an invitation for a player by removing the email
   * Only OWNER or ADMIN can cancel invitations
   *
   * @param playerId - The ID of the player (invited player) to cancel
   * @param userId - The ID of the user performing the cancellation
   * @returns The updated player with email cleared
   */
  execute(playerId: string, userId: string): Promise<Player>;
}
