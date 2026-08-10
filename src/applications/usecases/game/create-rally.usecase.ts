import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, GameReason } from "@/entities/errors";
import { createRallyEntry, type Entry, type Rally } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ICreateRallyInput {
  params: { gameId: string; setIndex: number; entryIndex: number };
  data: Rally;
}

export type ICreateRallyOutput = Entry[];

export interface ICreateRallyUseCase {
  execute(input: ICreateRallyInput): Promise<ICreateRallyOutput | undefined>;
}

@injectable()
export class CreateRallyUseCase implements ICreateRallyUseCase {
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

    // Read for the team the caller must belong to; whether the set exists is
    // the write's own condition.
    const game = await this.gameRepository.findById(gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    return this.gameRepository.appendEntry(
      { gameId, setIndex },
      createRallyEntry(rally),
    );
  }
}
