import { inject, injectable } from 'inversify';
import type { IGetUserPlayersUseCase } from '@/applications/usecases/player/get-user-players.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { TYPES } from '@/infrastructure/di/types';
import { Player } from '@/entities/player';

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
    private playerRepository: IPlayerRepository
  ) {}

  async execute(userId: string): Promise<Player[]> {
    // Get all teams user has joined
    const joinedPlayers = await this.playerRepository.findByUserId(userId);

    return joinedPlayers;
  }
}
