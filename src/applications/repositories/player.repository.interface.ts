import { Player } from '@/entities/player';

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
  findInvitedByTeamIdAndEmail(teamId: string, email: string): Promise<Player | null>;

  /**
   * Create new player
   */
  create(player: Omit<Player, '_id' | 'createdAt' | 'updatedAt'>): Promise<Player>;

  /**
   * Update player
   */
  update(id: string, updates: Partial<Player>): Promise<Player | null>;

  /**
   * Delete player by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count total players in a team
   */
  countByTeamId(teamId: string): Promise<number>;

  /**
   * Find owner of a team
   */
  findTeamOwner(teamId: string): Promise<Player | null>;

  /**
   * Find all admins in a team
   */
  findAdminsByTeamId(teamId: string): Promise<Player[]>;

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
   * Returns the number of records modified.
   */
  linkUserToInvitations(email: string, userId: string): Promise<number>;
}
