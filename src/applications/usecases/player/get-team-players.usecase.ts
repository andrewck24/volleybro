import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { Player } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetTeamPlayersInput {
  teamId: string;
}

export interface IGetTeamPlayersUseCase {
  execute(input: IGetTeamPlayersInput): Promise<Player[]>;
}

/**
 * GetTeamPlayersUseCase Implementation
 * Get all players in a team (members, invitees, pure players)
 */
@injectable()
export class GetTeamPlayersUseCase implements IGetTeamPlayersUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
  ) {}

  async execute({ teamId }: IGetTeamPlayersInput): Promise<Player[]> {
    return this.playerRepository.findByTeamId(teamId);
  }
}
