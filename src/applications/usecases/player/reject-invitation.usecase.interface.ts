/**
 * RejectInvitationUseCase Interface
 * User Story 2: Reject invitation
 */
export interface IRejectInvitationUseCase {
  /**
   * Reject invitation and clear email from player record
   * @param playerId Player ID with pending invitation
   * @param userId User ID of the invitee (must match invitation email)
   */
  execute(playerId: string, userId: string): Promise<void>;
}
