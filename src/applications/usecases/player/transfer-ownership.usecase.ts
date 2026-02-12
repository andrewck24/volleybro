import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { Player } from "@/entities/player";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";
import type { ITransferOwnershipUseCase } from "./transfer-ownership.usecase.interface";

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
      throw new Error("Current owner not found in team");
    }

    // 2. Verify current user has OWNER role
    if (currentOwner.role !== PlayerRole.OWNER) {
      throw new Error("Only current owner can transfer ownership");
    }

    // 3. Get new owner and verify they're in the same team
    const newOwner = await this.playerRepository.findById(newOwnerId);
    if (!newOwner) {
      throw new Error("Player not found");
    }

    if (newOwner.teamId !== teamId) {
      throw new Error("Target player is not in this team");
    }

    // 4. Verify new owner is a JOINED member (has userId)
    if (!newOwner.userId) {
      throw new Error("Target player must be a joined member");
    }

    // 5. Transfer: update new owner to OWNER, demote current owner to ADMIN
    const updatedNewOwner = await this.playerRepository.update(newOwnerId, {
      role: PlayerRole.OWNER,
    });

    if (!updatedNewOwner) {
      throw new Error("Failed to update new owner");
    }

    // 6. Demote current owner to ADMIN
    await this.playerRepository.update(currentOwner._id, {
      role: PlayerRole.ADMIN,
    });

    return updatedNewOwner;
  }
}
