import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { Player } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetUserPlayersInput {
  userId: string;
}

export interface IGetUserPlayersUseCase {
  execute(input: IGetUserPlayersInput): Promise<Player[]>;
}

/**
 * GetUserPlayersUseCase Implementation
 * Get all teams/invitations for a user
 *
 * Returns:
 * - All teams user has joined (userId set)
 * - All pending invitations for user (email set, userId not set)
 */
@injectable()
export class GetUserPlayersUseCase implements IGetUserPlayersUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
  ) {}

  async execute({ userId }: IGetUserPlayersInput): Promise<Player[]> {
    // Get all teams user has joined
    const joinedPlayers = await this.playerRepository.findByUserId(userId);

    return joinedPlayers;
  }
}
