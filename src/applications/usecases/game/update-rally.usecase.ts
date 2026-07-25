import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, GameReason } from "@/entities/errors";
import type { Entry, Rally } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { updateRallyHelper } from "@/lib/features/game/helpers";
import { inject, injectable } from "inversify";

export type IUpdateRallyInput = {
  params: { gameId: string; setIndex: number; entryIndex: number };
  data: Rally;
};

export type IUpdateRallyOutput = Entry[];

export interface IUpdateRallyUseCase {
  execute(input: IUpdateRallyInput): Promise<IUpdateRallyOutput | undefined>;
}

@injectable()
export class UpdateRallyUseCase implements IUpdateRallyUseCase {
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

    const persistedGame = await this.gameRepository.update(
      game.id,
      updatedGame,
    );

    const persistedSet = persistedGame.sets[params.setIndex];
    if (!persistedSet)
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found");
    return persistedSet.entries;
  }
}
