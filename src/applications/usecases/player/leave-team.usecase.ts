import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { clearActiveTeam } from "@/applications/usecases/player/membership";
import {
  AuthorizationError,
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import {
  hasTeamRole,
  isTeamMember,
  PlayerRole,
  PlayerStatus,
} from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ILeaveTeamInput {
  playerId: string;
  userId: string;
}

export interface ILeaveTeamUseCase {
  execute(input: ILeaveTeamInput): Promise<{ success: boolean }>;
}

@injectable()
export class LeaveTeamUseCase implements ILeaveTeamUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute({
    playerId,
    userId,
  }: ILeaveTeamInput): Promise<{ success: boolean }> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    if (!isTeamMember(player) || player.userId !== userId) {
      throw new AuthorizationError(
        PlayerReason.NOT_PLAYER_OWNER,
        "You cannot leave a player that does not belong to you",
      );
    }

    if (hasTeamRole(player, PlayerRole.OWNER)) {
      throw new AuthorizationError(
        PlayerReason.OWNER_CANNOT_LEAVE,
        "Team owner cannot leave the team",
      );
    }

    const updated = await this.playerRepository.update(playerId, {
      status: PlayerStatus.NONE,
      userId: undefined,
      email: undefined,
      role: undefined,
    });
    if (!updated) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to leave team",
      );
    }

    if (!player.teamId)
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player has no team",
      );
    await this.teamRepository.removePlayerFromLineups(player.teamId, playerId);

    await clearActiveTeam(this.profileRepository, userId, player.teamId);

    return { success: true };
  }
}
