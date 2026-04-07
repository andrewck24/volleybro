import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { GameReason } from "@/entities/errors/reasons/game";
import { type Game, type Set } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IUpdateSetInput {
  params: { gameId: string; setIndex: number };
  data: {
    options: Set["options"];
  };
}

export interface IUpdateSetOutput extends Game {}

export interface IUpdateSetUseCase {
  execute(input: IUpdateSetInput): Promise<IUpdateSetOutput | undefined>;
}

@injectable()
export class UpdateSetUseCase implements IUpdateSetUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(input: IUpdateSetInput): Promise<IUpdateSetOutput | undefined> {
    const { params, data } = input;
    const user = await this.authenticationService.verifySession();

    const game = await this.gameRepository.findById(params.gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    if (!game.sets[params.setIndex])
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found");

    game.sets[params.setIndex].options = data.options;

    const updatedGame = await this.gameRepository.update(params.gameId, game);

    return updatedGame;
  }
}
