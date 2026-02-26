import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IRejectInvitationUseCase } from "@/applications/usecases/player/reject-invitation.usecase.interface";
import { PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

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

  async execute(playerId: string, _userId: string): Promise<void> {
    const player = await this.playerRepository.findById(playerId);

    if (!player) {
      throw new Error("Player record not found");
    }

    if (player.status !== PlayerStatus.INVITED) {
      throw new Error("No invitation found for this player");
    }

    await this.playerRepository.update(playerId, {
      status: PlayerStatus.NONE,
      email: undefined,
      userId: undefined,
    });
  }
}
