import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import {
  AuthorizationError,
  AuthReason,
  PlayerReason,
  NotFoundError,
  CommonReason,
} from "@/entities/errors";
import type { ManageRefusal, Player } from "@/entities/player";
import { refuseToManagePlayer } from "@/entities/player";

const DETAILS: Record<ManageRefusal, string> = {
  [AuthReason.NOT_TEAM_MEMBER]: "User is not a member of this team",
  [AuthReason.INSUFFICIENT_ROLE]: "Insufficient permissions for this action",
  [PlayerReason.TARGET_IS_OWNER]:
    "The owner can only leave the role by transferring it",
  [PlayerReason.TARGET_IS_SELF]: "You cannot target your own player",
};

/**
 * Authorize the caller against the player they are about to change or delete.
 * The caller is their own player on the target's team, so this answers both
 * "does the caller belong to this team" and "may they manage this target".
 */
export const authorizeManagePlayer = async (
  players: IPlayerRepository,
  teams: ITeamRepository,
  teamId: string,
  target: Player,
  userId: string,
): Promise<void> => {
  const actor = await players.findByTeamIdAndUserId(teamId, userId);
  const team = await teams.findById(teamId);
  if (!team)
    throw new NotFoundError(CommonReason.RESOURCE_NOT_FOUND, "Team not found");
  const refusal = refuseToManagePlayer(actor, target, team.ownerPlayerId);
  if (refusal) throw new AuthorizationError(refusal, DETAILS[refusal]);
};
