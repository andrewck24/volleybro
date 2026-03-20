import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { Player } from "@/entities/player";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";
import type { ITransferOwnershipUseCase } from "./transfer-ownership.usecase.interface";
import { NotFoundError, AuthorizationError, ConflictError, UnexpectedError } from "@/entities/errors/app-error";
import { PlayerReason } from "@/entities/errors/reasons/player";
import { CommonReason } from "@/entities/errors/reasons/common";

@injectable()
export class TransferOwnershipUseCase implements ITransferOwnershipUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
  ) {}

  async execute(
    teamId: string,
    newOwnerId: string,
    userId: string,
  ): Promise<Player> {
    // 1. Find current owner by teamId + userId
    const currentOwner = await this.playerRepository.findByTeamIdAndUserId(
      teamId,
      userId,
    );
    if (!currentOwner) {
      throw new NotFoundError(PlayerReason.PLAYER_NOT_FOUND, "Current owner not found in team");
    }

    // 2. Verify current user has OWNER role
    if (currentOwner.role !== PlayerRole.OWNER) {
      throw new AuthorizationError(PlayerReason.NOT_TEAM_OWNER, "Only the current team owner can transfer ownership");
    }

    // 3. Get new owner and verify they're in the same team
    const newOwner = await this.playerRepository.findById(newOwnerId);
    if (!newOwner) {
      throw new NotFoundError(PlayerReason.PLAYER_NOT_FOUND, "Target player not found");
    }

    if (newOwner.teamId !== teamId) {
      throw new NotFoundError(PlayerReason.TARGET_NOT_IN_TEAM, "Target player is not in this team");
    }

    // 4. Verify new owner is a JOINED member (has userId)
    if (!newOwner.userId) {
      throw new ConflictError(PlayerReason.TARGET_NOT_MEMBER, "Target player must be an active member of the team");
    }

    // 5. Transfer: update new owner to OWNER, demote current owner to ADMIN
    const updatedNewOwner = await this.playerRepository.update(newOwnerId, {
      role: PlayerRole.OWNER,
    });

    if (!updatedNewOwner) {
      throw new UnexpectedError(CommonReason.UNHANDLED_ERROR, "Failed to update new owner");
    }

    // 6. Demote current owner to ADMIN
    await this.playerRepository.update(currentOwner._id, {
      role: PlayerRole.ADMIN,
    });

    return updatedNewOwner;
  }
}
