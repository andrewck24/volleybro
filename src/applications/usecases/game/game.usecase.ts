import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { GameReason } from "@/entities/errors/reasons/game";
import type { Game } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IFindGameInput {
  params: { id: string };
}

export type IFindGameOutput = Game;

@injectable()
export class FindGameUseCase {
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

export interface ICreateGameInput {
  params: { teamId: string };
  data: {
    info: Game["info"];
    teams: Game["teams"];
  };
}

export interface ICreateGameOutput extends Game {}

@injectable()
export class CreateGameUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(
    input: ICreateGameInput,
  ): Promise<ICreateGameOutput | undefined> {
    const { params, data } = input;
    const user = await this.authenticationService.verifySession();

    await this.authorizationService.verifyTeamRole(
      params.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const game = await this.gameRepository.create({
      win: false,
      teamId: params.teamId,
      info: data.info,
      teams: { home: { ...data.teams.home }, away: { ...data.teams.away } },
      sets: [],
    });

    return game;
  }
}
