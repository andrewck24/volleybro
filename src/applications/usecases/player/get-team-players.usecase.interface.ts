import { Player } from '@/entities/player';

/**
 * GetTeamPlayersUseCase Interface
 * User Story 3: View all players in a team
 */
export interface IGetTeamPlayersUseCase {
  /**
   * Get all players in a team
   * @param teamId Team ID
   * @returns Array of all players (members, invitees, pure players)
   */
  execute(teamId: string): Promise<Player[]>;
}
