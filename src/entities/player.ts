/**
 * Player Entity - Unified player representation for team members, invited users, and pure players
 *
 * Status Model (explicit field):
 * - NONE: Pure player, no system account linked (userId ✗, email ✗)
 * - INVITED + userId: Registered user invited (userId ✓, email ✗)
 * - INVITED + email: Unregistered user invited (userId ✗, email ✓)
 * - JOINED: User has accepted invitation (userId ✓, email ✗)
 *
 * Role Management:
 * - MEMBER: regular team member
 * - ADMIN: team administrator with management privileges
 * - OWNER: team owner (unique per team)
 * - undefined: pure player without team and team role
 */

import { ValidationError, CommonReason } from "@/entities/errors";

export enum PlayerRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
}

export enum Position {
  NONE = "",
  OH = "OH",
  MB = "MB",
  OP = "OP",
  S = "S",
  L = "L",
}

export enum PlayerStatus {
  NONE = "NONE",
  INVITED = "INVITED",
  JOINED = "JOINED",
}

export type Player = {
  id: string;
  name: string;
  number?: number;
  position?: Position;
  status: PlayerStatus;
  teamId?: string;
  userId?: string;
  email?: string;
  role?: PlayerRole;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Validate that status and field combination is consistent.
 * Throws ValidationError if constraints are violated.
 */
export function validatePlayerStatus(player: Player): void {
  const { status, userId, email } = player;

  switch (status) {
    case PlayerStatus.NONE:
      if (userId || email) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "NONE status must not have userId or email",
        );
      }
      break;
    case PlayerStatus.INVITED:
      if (userId && email) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "INVITED status must have exactly one of userId or email, not both",
        );
      }
      if (!userId && !email) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "INVITED status must have either userId or email",
        );
      }
      break;
    case PlayerStatus.JOINED:
      if (!userId) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "JOINED status must have userId",
        );
      }
      if (email) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "JOINED status must not have email",
        );
      }
      break;
    default:
      throw new ValidationError(
        CommonReason.INVALID_INPUT,
        `Unknown player status: ${status}`,
      );
  }
}

export function canManageTeam(player: Player): boolean {
  return player.role === PlayerRole.OWNER || player.role === PlayerRole.ADMIN;
}

export function isOwner(player: Player): boolean {
  return player.role === PlayerRole.OWNER;
}
