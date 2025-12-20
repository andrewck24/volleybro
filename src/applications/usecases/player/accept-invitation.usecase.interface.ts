/**
 * AcceptInvitationUseCase Interface
 * User Story 2: Accept invitation to join team
 */
export interface IAcceptInvitationUseCase {
  /**
   * Accept invitation and join team
   * @param playerId Player ID with pending invitation
   * @param userId User ID of the invitee (must match auth context)
   */
  execute(playerId: string, userId: string): Promise<void>;
}
