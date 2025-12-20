import type { Player } from '@/entities/player';

export interface ITransferOwnershipUseCase {
  /**
   * Transfer OWNER role to another player in team
   * Current OWNER unlinks from team as regular member
   * @param currentOwnerId Current owner player ID
   * @param newOwnerId New owner player ID
   * @param userId Current OWNER's user ID
   * @returns Updated new owner player
   */
  execute(
    currentOwnerId: string,
    newOwnerId: string,
    userId: string
  ): Promise<Player>;
}
