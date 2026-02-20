export interface IRemovePlayerUseCase {
  /**
   * Remove player from team (delete player record)
   * Can only be removed if no match records reference them
   * @param playerId Player to remove
   * @param userId User ID of admin removing player
   * @returns Success confirmation
   */
  execute(playerId: string, userId: string): Promise<{ success: boolean }>;
}
