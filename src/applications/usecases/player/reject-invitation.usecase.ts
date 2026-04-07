import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { AuthorizationError, NotFoundError } from "@/entities/errors/app-error";
import { PlayerReason } from "@/entities/errors/reasons/player";
import { PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IRejectInvitationInput {
  playerId: string;
  userId: string;
}

export interface IRejectInvitationUseCase {
  execute(input: IRejectInvitationInput): Promise<void>;
}

/**
 * RejectInvitationUseCase Implementation
 * User rejects invitation: status INVITED → NONE, clears email and userId
 */
@injectable()
export class RejectInvitationUseCase implements IRejectInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
  ) {}

  async execute({ playerId, userId }: IRejectInvitationInput): Promise<void> {
    const player = await this.playerRepository.findById(playerId);

    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    if (player.status !== PlayerStatus.INVITED) {
      throw new NotFoundError(
        PlayerReason.NOT_INVITED,
        "No pending invitation found for this player",
      );
    }

    if (player.userId !== userId) {
      throw new AuthorizationError(
        PlayerReason.NOT_RECIPIENT,
        "You are not the invited recipient",
      );
    }

    await this.playerRepository.update(playerId, {
      status: PlayerStatus.NONE,
      email: undefined,
      userId: undefined,
    });
  }
}
