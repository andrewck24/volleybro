import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import {
  AuthorizationError,
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import { isTeamMember, PlayerStatus } from "@/entities/player";
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

    if (!player.teamId)
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player has no team",
      );
    const team = await this.teamRepository.findById(player.teamId);
    if (!team)
      throw new NotFoundError(
        CommonReason.RESOURCE_NOT_FOUND,
        "Team not found",
      );
    if (team.ownerPlayerId === player.id) {
      throw new AuthorizationError(
        PlayerReason.OWNER_CANNOT_LEAVE,
        "Team owner cannot leave the team",
      );
    }

    // Lineups first: a failed update leaves a member who can leave again.
    await this.teamRepository.removePlayerFromLineups(player.teamId, playerId);

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

    return { success: true };
  }
}
