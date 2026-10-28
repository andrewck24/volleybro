import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  PlayerReason,
  CommonReason,
  ValidationError,
} from "@/entities/errors";
import type { Team } from "@/entities/team";
import { isTeamMember, PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ITransferOwnershipInput {
  teamId: string;
  newOwnerId: string;
  userId: string;
}

export interface ITransferOwnershipUseCase {
  execute(input: ITransferOwnershipInput): Promise<Team>;
}

@injectable()
export class TransferOwnershipUseCase implements ITransferOwnershipUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
  ) {}

  async execute({
    teamId,
    newOwnerId,
    userId,
  }: ITransferOwnershipInput): Promise<Team> {
    const team = await this.teamRepository.findById(teamId);
    if (!team)
      throw new NotFoundError(
        CommonReason.RESOURCE_NOT_FOUND,
        "Team not found",
      );
    const currentOwner = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId,
    );
    if (
      !currentOwner ||
      !isTeamMember(currentOwner) ||
      currentOwner.id !== team.ownerPlayerId
    ) {
      throw new AuthorizationError(
        PlayerReason.NOT_TEAM_OWNER,
        "Only the current team owner can transfer ownership",
      );
    }

    const newOwner = await this.playerRepository.findById(newOwnerId);
    if (!newOwner) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Target player not found",
      );
    }

    if (newOwner.teamId !== teamId) {
      throw new NotFoundError(
        PlayerReason.TARGET_NOT_IN_TEAM,
        "Target player is not in this team",
      );
    }

    if (newOwner.id === currentOwner.id) {
      throw new ConflictError(
        PlayerReason.TARGET_ALREADY_OWNER,
        "Ownership cannot be transferred to the current owner",
      );
    }

    if (!isTeamMember(newOwner)) {
      throw new ConflictError(
        PlayerReason.TARGET_NOT_MEMBER,
        "Target player must be an active member of the team",
      );
    }

    if (newOwner.role !== PlayerRole.ADMIN) {
      throw new ValidationError(
        PlayerReason.TRANSFER_TARGET_NOT_ADMIN,
        "Target player must be an administrator",
      );
    }
    const updated = await this.teamRepository.transferOwnership(
      teamId,
      currentOwner.id,
      newOwner.id,
    );
    if (!updated) {
      throw new AuthorizationError(
        PlayerReason.NOT_TEAM_OWNER,
        "Only the current team owner can transfer ownership",
      );
    }
    return updated;
  }
}
