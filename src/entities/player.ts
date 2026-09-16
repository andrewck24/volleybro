/**
 * Player Entity - one row on a team's roster, in one of three shapes.
 *
 * - UnlinkedPlayer: on the roster only, no account and no role.
 * - InvitedPlayer: invited, holding the role the invitation offered, reachable
 *   by exactly one of userId (registered) or email (not yet registered).
 * - TeamMember: joined with an account; only members hold team permissions.
 *
 * Membership, the role hierarchy and who may manage whom are decided here,
 * without any I/O.
 */

import {
  AuthReason,
  CommonReason,
  PlayerReason,
  ValidationError,
} from "@/entities/errors";

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

type PlayerBase = {
  id: string;
  name: string;
  number?: number;
  position?: Position;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UnlinkedPlayer = PlayerBase & { status: PlayerStatus.NONE };

export type InvitedPlayer = PlayerBase & {
  status: PlayerStatus.INVITED;
  role: PlayerRole;
} & ({ userId: string; email?: never } | { email: string; userId?: never });

export type TeamMember = PlayerBase & {
  status: PlayerStatus.JOINED;
  userId: string;
  role: PlayerRole;
};

export type Player = UnlinkedPlayer | InvitedPlayer | TeamMember;

type DistributiveOmit<T, K extends keyof never> = T extends unknown
  ? Omit<T, K>
  : never;

/** A player to store: one of the three shapes, before the database assigns ids. */
export type NewPlayer = DistributiveOmit<
  Player,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Every field a player document can carry. Writes patch single fields, so a
 * patch cannot be checked against the three shapes; reads go through
 * `narrowPlayer`, which can.
 */
export type PlayerFields = PlayerBase & {
  status: PlayerStatus;
  userId?: string;
  email?: string;
  role?: PlayerRole;
};

/**
 * Narrow a stored document to one of the three shapes. The combinations are
 * expressed by the types, but a document read from the database has never
 * passed through them, so this is where they are checked.
 */
export function narrowPlayer(fields: PlayerFields): Player {
  const { status, userId, email, role } = fields;

  switch (status) {
    case PlayerStatus.NONE:
      if (userId || email || role) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "An unlinked player must not have userId, email or role",
        );
      }
      return fields as UnlinkedPlayer;
    case PlayerStatus.INVITED:
      if (!role) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "An invited player must have a role",
        );
      }
      if (!userId === !email) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "An invited player must have exactly one of userId or email",
        );
      }
      return fields as InvitedPlayer;
    case PlayerStatus.JOINED:
      if (!userId) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "A team member must have a userId",
        );
      }
      if (!role) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "A team member must have a role",
        );
      }
      if (email) {
        throw new ValidationError(
          CommonReason.INVALID_INPUT,
          "A team member must not have an email",
        );
      }
      return fields as TeamMember;
    default:
      throw new ValidationError(
        CommonReason.INVALID_INPUT,
        `Unknown player status: ${String(status)}`,
      );
  }
}

export function isTeamMember(player: Player): player is TeamMember {
  return player.status === PlayerStatus.JOINED;
}

const ROLE_RANK = {
  [PlayerRole.MEMBER]: 1,
  [PlayerRole.ADMIN]: 2,
  [PlayerRole.OWNER]: 3,
} satisfies Record<PlayerRole, number>;

export function hasTeamRole(member: TeamMember, required: PlayerRole): boolean {
  return ROLE_RANK[member.role] >= ROLE_RANK[required];
}

export function canManageTeam(member: TeamMember): boolean {
  return hasTeamRole(member, PlayerRole.ADMIN);
}

export function isOwner(member: TeamMember): boolean {
  return hasTeamRole(member, PlayerRole.OWNER);
}

export type ManageRefusal =
  | AuthReason.NOT_TEAM_MEMBER
  | AuthReason.INSUFFICIENT_ROLE
  | PlayerReason.TARGET_IS_OWNER
  | PlayerReason.TARGET_IS_SELF;

/**
 * Why `actor` may not change `target`'s role or delete them, or null when the
 * two stand in a relation that allows it. Admins may manage their peers; the
 * owner is nobody's target and ownership leaves only by transfer; nobody
 * targets their own player, because leaving the team is that path.
 *
 * The refusal is returned rather than thrown so each caller phrases it.
 */
export function refuseToManagePlayer(
  actor: Player | null,
  target: Player,
): ManageRefusal | null {
  if (!actor || !isTeamMember(actor) || actor.teamId !== target.teamId)
    return AuthReason.NOT_TEAM_MEMBER;
  if (!canManageTeam(actor)) return AuthReason.INSUFFICIENT_ROLE;
  if (isTeamMember(target) && isOwner(target))
    return PlayerReason.TARGET_IS_OWNER;
  if (actor.id === target.id) return PlayerReason.TARGET_IS_SELF;
  return null;
}
