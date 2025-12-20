/**
 * CreateInvitationUseCase Interface
 * Invitation use case for User Story 1: Team managers invite members
 */
export interface ICreateInvitationUseCase {
  /**
   * Create invitation for user to join team with specified role
   * @param teamId Team to join
   * @param email Email of user to invite
   * @param role Role to assign (MEMBER or ADMIN)
   * @param createdBy User ID of the person inviting (must be ADMIN or OWNER)
   * @returns Created player ID
   */
  execute(
    teamId: string,
    email: string,
    role: string,
    createdBy: string
  ): Promise<string>;
}
