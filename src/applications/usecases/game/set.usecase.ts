import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { GameReason } from "@/entities/errors/reasons/game";
import {
  type Game,
  type Set,
  PlayerStatsClass,
  TeamStatsClass,
} from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { type Lineup } from "@/entities/team";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ICreateSetInput {
  params: { gameId: string; setIndex: number };
  data: {
    lineup: Lineup;
    options: Set["options"];
  };
}

export interface ICreateSetOutput extends Game {}

@injectable()
export class CreateSetUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(input: ICreateSetInput): Promise<ICreateSetOutput | undefined> {
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

    // 新增上場選手(在 lineups 中)對應局數的 stats 物件（在開新局、換人時）
    const startingPlayers = data.lineup.starting.map((player) => player.id);
    const liberoPlayers = data.lineup.liberos.map((player) => player.id);
    const activePlayerIds = new Set([...startingPlayers, ...liberoPlayers]);

    game.teams.home.players.forEach((player) => {
      if (activePlayerIds.has(player.id.toString())) {
        player.stats[params.setIndex] = new PlayerStatsClass();
      }
    });
    game.teams.home.stats[params.setIndex] = new TeamStatsClass();
    game.teams.away.stats[params.setIndex] = new TeamStatsClass();

    if (params.setIndex === 0) delete game.teams.home.lineup;

    game.sets[params.setIndex] = {
      win: null,
      lineups: { home: data.lineup },
      options: data.options,
      entries: [],
    };

    const updatedGame = await this.gameRepository.update(params.gameId, game);

    return updatedGame;
  }
}

export interface IUpdateSetInput {
  params: { gameId: string; setIndex: number };
  data: {
    // lineup: Lineup;
    options: Set["options"];
  };
}

export interface IUpdateSetOutput extends Game {}

@injectable()
export class UpdateSetUseCase {
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

    game.sets[params.setIndex].options = data.options;
    // TODO: new feature: update lineup of the set (without increasing substitution count)

    const updatedGame = await this.gameRepository.update(params.gameId, game);

    return updatedGame;
  }
}
