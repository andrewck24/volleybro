import { inject, injectable } from 'inversify';
import type { IGetTeamPlayersUseCase } from '@/applications/usecases/player/get-team-players.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { TYPES } from '@/infrastructure/di/types';
import { Player } from '@/entities/player';

/**
 * GetTeamPlayersUseCase Implementation
 * Get all players in a team (members, invitees, pure players)
 */
@injectable()
export class GetTeamPlayersUseCase implements IGetTeamPlayersUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository
  ) {}

  async execute(teamId: string): Promise<Player[]> {
    return this.playerRepository.findByTeamId(teamId);
  }
}
