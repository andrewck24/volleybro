import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { deriveSetCompletion } from "@/applications/usecases/game/derive-set-completion";
import { NotFoundError, GameReason } from "@/entities/errors";
import {
  createRallyEntry,
  type Entry,
  type EntryIdentity,
  type Rally,
} from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export type IUpdateRallyInput = {
  params: { gameId: string; setIndex: number; entryIndex: number };
  data: Rally & EntryIdentity;
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
    const { gameId, setIndex, entryIndex } = params;
    const user = await this.authenticationService.verifySession();

    // Read for the team the caller must belong to; whether the entry exists is
    // the write's own condition.
    const game = await this.gameRepository.findById(gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const entries = await this.gameRepository.replaceEntry(
      { gameId, setIndex, entryIndex },
      createRallyEntry(rally),
    );

    const completion = deriveSetCompletion(game, setIndex, entries);
    if (completion)
      await this.gameRepository.completeSet(
        { gameId, setIndex },
        completion.win,
        completion.gameWin,
      );

    return entries;
  }
}
