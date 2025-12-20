import type { Player } from '@/entities/player';
import type { PlayerRole } from '@/entities/player';

export interface IUpdateRoleUseCase {
  /**
   * Update a player's role within a team
   * @param playerId Player to update
   * @param newRole New role to assign (MEMBER or ADMIN)
   * @param userId User ID of the person making the change (must be ADMIN or OWNER)
   * @returns Updated player
   */
  execute(playerId: string, newRole: PlayerRole, userId: string): Promise<Player>;
}
