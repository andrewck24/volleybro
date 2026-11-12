import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, PlayerReason } from "@/entities/errors";
import { type Player, type Position } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IUpdatePlayerInfoInput {
  playerId: string;
  updates: { name?: string; number?: number; position?: Position };
  userId: string;
}

export interface IUpdatePlayerInfoUseCase {
  execute(input: IUpdatePlayerInfoInput): Promise<Player>;
}

@injectable()
export class UpdatePlayerInfoUseCase implements IUpdatePlayerInfoUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute({
    playerId,
    updates,
    userId,
  }: IUpdatePlayerInfoInput): Promise<Player> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    await this.authService.verifyIsTeamAdmin(player.teamId!, userId);

    const updateData: Partial<Player> = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.number !== undefined) {
      updateData.number = updates.number;
    }
    if (updates.position !== undefined) {
      updateData.position = updates.position;
    }

    const updatedPlayer = await this.playerRepository.update(
      playerId,
      updateData,
    );

    return updatedPlayer;
  }
}
