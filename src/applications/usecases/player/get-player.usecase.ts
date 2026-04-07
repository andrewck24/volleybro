import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { Player } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetPlayerInput {
  playerId: string;
}

export interface IGetPlayerUseCase {
  execute(input: IGetPlayerInput): Promise<Player | null>;
}

/**
 * GetPlayerUseCase Implementation
 * Get single player by ID
 */
@injectable()
export class GetPlayerUseCase implements IGetPlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
  ) {}

  async execute({ playerId }: IGetPlayerInput): Promise<Player | null> {
    return this.playerRepository.findById(playerId);
  }
}
