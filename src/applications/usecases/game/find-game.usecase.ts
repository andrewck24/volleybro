import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, GameReason } from "@/entities/errors";
import type { Game } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IFindGameInput {
  params: { id: string };
}

export type IFindGameOutput = Game;

export interface IFindGameUseCase {
  execute(input: IFindGameInput): Promise<IFindGameOutput | undefined>;
}

@injectable()
export class FindGameUseCase implements IFindGameUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(input: IFindGameInput): Promise<IFindGameOutput | undefined> {
    const { params } = input;
    const user = await this.authenticationService.verifySession();

    const game = await this.gameRepository.findById(params.id);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    return game;
  }
}
