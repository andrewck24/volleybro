import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import {
  AuthorizationError,
  AuthReason,
  PlayerReason,
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
  teamId: string,
  target: Player,
  userId: string,
): Promise<void> => {
  const actor = await players.findByTeamIdAndUserId(teamId, userId);
  const refusal = refuseToManagePlayer(actor, target);
  if (refusal) throw new AuthorizationError(refusal, DETAILS[refusal]);
};

/** A default team must not outlive the membership it points at. */
export const clearActiveTeam = async (
  profiles: IProfileRepository,
  userId: string,
  teamId: string,
): Promise<void> => {
  const profile = await profiles.findByUserId(userId);
  if (profile?.activeTeamId === teamId)
    await profiles.updateActiveTeamId(userId, null);
};
