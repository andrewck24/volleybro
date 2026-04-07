import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { GameReason } from "@/entities/errors/reasons/game";
import type { Entry, Rally } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import {
  createRallyHelper,
  updateRallyHelper,
} from "@/lib/features/game/helpers";
import { inject, injectable } from "inversify";

export interface ICreateRallyInput {
  params: { gameId: string; setIndex: number; entryIndex: number };
  data: Rally;
}

export type ICreateRallyOutput = Entry[];

@injectable()
export class CreateRallyUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(
    input: ICreateRallyInput,
  ): Promise<ICreateRallyOutput | undefined> {
    const { params, data: rally } = input;
    const { gameId, setIndex } = params;
    const user = await this.authenticationService.verifySession();

    const game = await this.gameRepository.findById(gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
    if (!game.sets[setIndex])
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    // TODO: handle race condition
    // 若傳入的 setIndex, (entryIndex), scores, type, num 一致時，則視為同筆資料不新增
    // 若 setIndex, score 等資料不同時，通知後傳入之使用者，令其選擇合適之紀錄，或新增於前者紀錄之後（如何更新前者之資料？）

    const { game: updatedGame } = createRallyHelper(params, rally, game);

    await this.gameRepository.update(gameId, updatedGame);

    return game.sets[setIndex].entries;
  }
}

export type IUpdateRallyInput = {
  params: { gameId: string; setIndex: number; entryIndex: number };
  data: Rally;
};

export type IUpdateRallyOutput = Entry[];

@injectable()
export class UpdateRallyUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(
    input: IUpdateRallyInput,
  ): Promise<IUpdateRallyOutput | undefined> {
    const { params, data: rally } = input;
    const user = await this.authenticationService.verifySession();

    const game = await this.gameRepository.findById(params.gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
    if (!game.sets[params.setIndex])
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const { game: updatedGame } = updateRallyHelper(params, rally, game);

    await this.gameRepository.update(game.id, updatedGame);

    return updatedGame.sets[params.setIndex].entries;
  }
}
