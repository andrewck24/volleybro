import { NewPlayer, Player, PlayerFields } from "@/entities/player";

/**
 * IPlayerRepository Interface
 * Abstract interface for Player data access operations
 * Implements Repository Pattern for Clean Architecture
 */
export interface IPlayerRepository {
  /**
   * Find player by ID
   */
  findById(id: string): Promise<Player | null>;

  /**
   * Find all players in a team
   */
  findByTeamId(teamId: string): Promise<Player[]>;

  /**
   * Find all teams/players a user belongs to
   */
  findByUserId(userId: string): Promise<Player[]>;

  /**
   * Find players by email (typically invitation status)
   */
  findByEmail(email: string): Promise<Player[]>;

  /**
   * Find invited players for a team (email exists, userId doesn't)
   */
  findInvitedByTeamIdAndEmail(
    teamId: string,
    email: string,
  ): Promise<Player | null>;

  /**
   * Create new player
   */
  create(player: NewPlayer): Promise<Player>;

  /**
   * Update player. A patch touches single fields, so it is typed against the
   * document's fields rather than the three player shapes; the caller is
   * responsible for leaving the document in one of them.
   */
  update(id: string, updates: Partial<PlayerFields>): Promise<Player | null>;

  /**
   * Delete player by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count total players in a team
   */
  countByTeamId(teamId: string): Promise<number>;

  /**
   * Check if email invitation already exists in team
   */
  existsInvitation(teamId: string, email: string): Promise<boolean>;

  /**
   * Find a player by team ID and user ID
   * Used for verifying user's role in a specific team
   */
  findByTeamIdAndUserId(teamId: string, userId: string): Promise<Player | null>;

  /**
   * Batch-link pending INVITED players (by email) to a registered userId.
   * Uses updateMany: sets userId, clears email, idempotent.
   * Returns the number of players modified.
   */
  linkUserToInvitations(email: string, userId: string): Promise<number>;
}
