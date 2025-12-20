import { Player } from '@/entities/player';

/**
 * GetUserPlayersUseCase Interface
 * Query use case to fetch all players (teams) for a user
 */
export interface IGetUserPlayersUseCase {
  /**
   * Get all players/teams for a user, including pending invitations
   * @param userId User ID
   * @returns Array of Player records (teams and invitations)
   */
  execute(userId: string): Promise<Player[]>;
}
