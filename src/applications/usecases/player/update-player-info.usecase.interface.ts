import type { Player, Position } from "@/entities/player";

export interface IUpdatePlayerInfoUseCase {
  /**
   * Update player information (name, number, position)
   * Note: email cannot be updated through this use case
   * @param playerId Player to update
   * @param updates Partial player data to update (name, number, position)
   * @param userId User ID of the person making the change (must be ADMIN or OWNER)
   * @returns Updated player
   */
  execute(
    playerId: string,
    updates: {
      name?: string;
      number?: number;
      position?: Position;
    },
    userId: string,
  ): Promise<Player>;
}
