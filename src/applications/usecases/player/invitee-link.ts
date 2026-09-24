import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { ConflictError, CommonReason, PlayerReason } from "@/entities/errors";

/** The one way an invitation reaches its recipient: an account, or an address. */
export type InviteeLink =
  { userId: string; email?: never } | { email: string; userId?: never };

export interface InviteeRepositories {
  players: IPlayerRepository;
  users: IUserRepository;
}

const alreadyOnRoster = () =>
  new ConflictError(
    PlayerReason.ALREADY_ON_ROSTER,
    "This email already belongs to a player on this team",
  );

/**
 * Decide what an invitation to `email` should store, and refuse the addresses
 * that would put the same person on the roster twice.
 *
 * Callers must have verified the caller is a team admin first: every lookup and
 * every error below answers a question about this team's roster.
 */
export const resolveInviteeLink = async (
  { players, users }: InviteeRepositories,
  teamId: string,
  email: string,
): Promise<InviteeLink> => {
  const address = email.trim();
  const matches = await users.findAllByEmailInsensitive(address);

  if (matches.length > 1) {
    throw new ConflictError(
      PlayerReason.AMBIGUOUS_EMAIL,
      "This email matches more than one account",
    );
  }

  const user = matches[0];
  if (user) {
    if (await players.findByTeamIdAndUserId(teamId, user.id))
      throw alreadyOnRoster();
    return { userId: user.id };
  }

  const unregistered = address.toLowerCase();
  if (await players.findInvitedByTeamIdAndEmail(teamId, unregistered))
    throw alreadyOnRoster();
  return { email: unregistered };
};

/**
 * The partial unique indexes on (teamId, userId) and (teamId, email) close the
 * race the checks above cannot. To the caller it is the same conflict, not the
 * generic duplicate-resource one.
 */
export const asRosterConflict = (error: unknown): unknown =>
  error instanceof ConflictError &&
  error.reason === CommonReason.DUPLICATE_RESOURCE
    ? alreadyOnRoster()
    : error;
