import { NewPlayer, Player, PlayerFields, PlayerRole } from "@/entities/player";
import type { NormalizedEmail } from "@/entities/user";

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;

  findByTeamId(teamId: string): Promise<Player[]>;

  findByUserId(userId: string): Promise<Player[]>;

  findByUserIdOrInvitedEmail(
    userId: string,
    email: NormalizedEmail,
  ): Promise<Player[]>;

  findInvitedByTeamIdAndEmail(
    teamId: string,
    email: NormalizedEmail,
  ): Promise<Player | null>;

  create(player: NewPlayer): Promise<Player>;

  update(id: string, updates: Partial<PlayerFields>): Promise<Player>;

  updateRoleIf(
    id: string,
    from: PlayerRole,
    to: PlayerRole,
  ): Promise<Player | null>;

  delete(id: string): Promise<boolean>;

  findByTeamIdAndUserId(teamId: string, userId: string): Promise<Player | null>;

  linkUserToInvitations(
    email: NormalizedEmail,
    userId: string,
  ): Promise<number>;
}
