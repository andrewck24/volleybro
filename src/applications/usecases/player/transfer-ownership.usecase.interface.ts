import type { Player } from "@/entities/player";

export interface ITransferOwnershipUseCase {
  /**
   * Transfer OWNER role to another player in team
   *
   * Internally finds the current owner via teamId + userId,
   * verifies ownership, and transfers to the new owner.
   *
   * @param teamId - The team to transfer ownership within
   * @param newOwnerId - New owner player ID
   * @param userId - Current OWNER's user ID (used to find and verify current owner)
   * @returns Updated new owner player
   */
  execute(teamId: string, newOwnerId: string, userId: string): Promise<Player>;
}
