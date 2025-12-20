/**
 * Player Entity - Unified player representation for team members, invited users, and pure players
 *
 * This entity combines the functionality of the old Team.members[] and Member collection
 * into a single unified structure.
 *
 * State Machine:
 * - INVITED: email ✓ && userId ✗ (waiting for user to accept)
 * - JOINED: userId ✓ (user has accepted invitation)
 * - PURE_PLAYER: email ✗ && userId ✗ (no system account, temporary/opponent player)
 *
 * Role Management:
 * - MEMBER: regular team member
 * - ADMIN: team administrator with management privileges
 * - OWNER: team owner (unique per team)
 * - null: pure player without team role
 */

export enum PlayerRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum Position {
  NONE = '',
  OH = 'OH', // Outside Hitter
  MB = 'MB', // Middle Blocker
  OP = 'OP', // Opposite
  S = 'S', // Setter
  L = 'L', // Libero
}

export enum PlayerStatus {
  INVITED = 'INVITED',
  JOINED = 'JOINED',
  PURE_PLAYER = 'PURE_PLAYER',
}

export type Player = {
  _id: string;
  name: string;
  number?: number;
  position?: Position;
  teamId?: string;
  userId?: string;
  email?: string;
  role?: PlayerRole;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Infer player status from field combinations
 * - If userId exists: JOINED (user has accepted invitation)
 * - Else if email exists: INVITED (waiting for user to accept)
 * - Else: PURE_PLAYER (no system account)
 */
export function getPlayerStatus(player: Player): PlayerStatus {
  if (player.userId) return PlayerStatus.JOINED;
  if (player.email) return PlayerStatus.INVITED;
  return PlayerStatus.PURE_PLAYER;
}

/**
 * Check if player can manage team (ADMIN or OWNER)
 */
export function canManageTeam(player: Player): boolean {
  return player.role === PlayerRole.OWNER || player.role === PlayerRole.ADMIN;
}

/**
 * Check if player is team owner
 */
export function isOwner(player: Player): boolean {
  return player.role === PlayerRole.OWNER;
}
