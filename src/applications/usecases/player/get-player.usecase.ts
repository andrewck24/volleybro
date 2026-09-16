import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { AuthorizationError, AuthReason } from "@/entities/errors";
import { Player, PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetPlayerInput {
  playerId: string;
  userId: string;
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
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute({ playerId, userId }: IGetPlayerInput): Promise<Player | null> {
    const player = await this.playerRepository.findById(playerId);

    if (!player) return null;

    if (!player.teamId) {
      throw new AuthorizationError(
        AuthReason.NOT_TEAM_MEMBER,
        "User is not a member of this team",
      );
    }

    await this.authorizationService.verifyTeamRole(
      player.teamId,
      userId,
      PlayerRole.MEMBER,
    );

    return player;
  }
}
