import { inject, injectable } from 'inversify';
import type { IGetPlayerUseCase } from '@/applications/usecases/player/get-player.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { TYPES } from '@/infrastructure/di/types';
import { Player } from '@/entities/player';

/**
 * GetPlayerUseCase Implementation
 * Get single player by ID
 */
@injectable()
export class GetPlayerUseCase implements IGetPlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository
  ) {}

  async execute(playerId: string): Promise<Player | null> {
    return this.playerRepository.findById(playerId);
  }
}
