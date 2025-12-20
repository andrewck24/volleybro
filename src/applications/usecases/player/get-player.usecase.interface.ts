import { Player } from '@/entities/player';

/**
 * GetPlayerUseCase Interface
 * User Story 3: Get single player details
 */
export interface IGetPlayerUseCase {
  /**
   * Get single player by ID
   * @param playerId Player ID
   * @returns Player details or null if not found
   */
  execute(playerId: string): Promise<Player | null>;
}
