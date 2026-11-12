import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { ConflictError, PlayerReason } from "@/entities/errors";
import { PlayerStatus } from "@/entities/player";
import { normalizeEmail } from "@/entities/user";

export type InviteeLink = { inviteeEmail: string } & (
  { userId: string; email?: never } | { email: string; userId?: never }
);

export interface InviteeRepositories {
  players: IPlayerRepository;
  users: IUserRepository;
}

const alreadyInvited = () =>
  new ConflictError(
    PlayerReason.ALREADY_INVITED,
    "This person has already been invited to this team",
  );

const alreadyOnRoster = () =>
  new ConflictError(
    PlayerReason.ALREADY_ON_ROSTER,
    "This email already belongs to a player on this team",
  );

export const resolveInviteeLink = async (
  { players, users }: InviteeRepositories,
  teamId: string,
  email: string,
): Promise<InviteeLink> => {
  const address = normalizeEmail(email);
  const user = await users.findByEmail(address);
  if (await players.findInvitedByTeamIdAndEmail(teamId, address))
    throw alreadyInvited();

  if (user) {
    const seat = await players.findByTeamIdAndUserId(teamId, user.id);
    if (seat?.status === PlayerStatus.INVITED) throw alreadyInvited();
    if (seat) throw alreadyOnRoster();
    return { userId: user.id, inviteeEmail: address };
  }
  return { email: address, inviteeEmail: address };
};
