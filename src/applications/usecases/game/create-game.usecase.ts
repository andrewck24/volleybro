import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { Game } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ICreateGameInput {
  params: { teamId: string };
  data: {
    info: Game["info"];
    teams: Game["teams"];
  };
}

export interface ICreateGameOutput extends Game {}

export interface ICreateGameUseCase {
  execute(input: ICreateGameInput): Promise<ICreateGameOutput | undefined>;
}

@injectable()
export class CreateGameUseCase implements ICreateGameUseCase {
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
      win: null,
      teamId: params.teamId,
      info: data.info,
      teams: { home: { ...data.teams.home }, away: { ...data.teams.away } },
      sets: [],
    });

    return game;
  }
}
