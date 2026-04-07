import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ILinkPendingInvitationsInput {
  email: string;
  userId: string;
}

export interface ILinkPendingInvitationsUseCase {
  execute(input: ILinkPendingInvitationsInput): Promise<number>;
}

@injectable()
export class LinkPendingInvitationsUseCase implements ILinkPendingInvitationsUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
  ) {}

  async execute({
    email,
    userId,
  }: ILinkPendingInvitationsInput): Promise<number> {
    const count = await this.playerRepository.linkUserToInvitations(
      email,
      userId,
    );
    return count;
  }
}
