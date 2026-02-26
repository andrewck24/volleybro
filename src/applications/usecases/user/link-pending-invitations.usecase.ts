import { inject, injectable } from "inversify";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { TransientError } from "@/applications/errors/app-error";
import type { Result } from "@/applications/types/result";
import { TYPES } from "@/infrastructure/di/types";

@injectable()
export class LinkPendingInvitationsUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository
  ) {}

  async execute(email: string, userId: string): Promise<Result<number>> {
    try {
      const count = await this.playerRepository.linkUserToInvitations(
        email,
        userId
      );
      return { ok: true, value: count };
    } catch {
      return {
        ok: false,
        error: new TransientError("Failed to link pending invitations"),
      };
    }
  }
}
