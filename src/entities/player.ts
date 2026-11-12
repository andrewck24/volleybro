import {
  AuthReason,
  CommonReason,
  PlayerReason,
  ValidationError,
} from "@/entities/errors";

export enum PlayerRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
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

export type NewPlayer = DistributiveOmit<
  Player,
  "id" | "createdAt" | "updatedAt"
> & { inviteeEmail?: string };

export type PlayerFields = PlayerBase & {
  status: PlayerStatus;
  userId?: string;
  email?: string;
  inviteeEmail?: string;
  role?: PlayerRole;
};

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
} satisfies Record<PlayerRole, number>;

export function hasTeamRole(member: TeamMember, required: PlayerRole): boolean {
  return ROLE_RANK[member.role] >= ROLE_RANK[required];
}

export function canManageTeam(member: TeamMember): boolean {
  return hasTeamRole(member, PlayerRole.ADMIN);
}

export type ManageRefusal =
  | AuthReason.NOT_TEAM_MEMBER
  | AuthReason.INSUFFICIENT_ROLE
  | PlayerReason.TARGET_IS_OWNER
  | PlayerReason.TARGET_IS_SELF;

export function refuseToManagePlayer(
  actor: Player | null,
  target: Player,
  ownerPlayerId: string | undefined,
): ManageRefusal | null {
  if (!actor || !isTeamMember(actor) || actor.teamId !== target.teamId)
    return AuthReason.NOT_TEAM_MEMBER;
  if (!canManageTeam(actor)) return AuthReason.INSUFFICIENT_ROLE;
  if (target.id === ownerPlayerId) return PlayerReason.TARGET_IS_OWNER;
  if (actor.id === target.id) return PlayerReason.TARGET_IS_SELF;
  return null;
}
