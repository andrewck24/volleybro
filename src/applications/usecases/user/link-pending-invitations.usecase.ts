import { inject, injectable } from "inversify";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { TYPES } from "@/infrastructure/di/types";

@injectable()
export class LinkPendingInvitationsUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository
  ) {}

  async execute(email: string, userId: string): Promise<number> {
    const count = await this.playerRepository.linkUserToInvitations(
      email,
      userId
    );
    return count;
  }
}
