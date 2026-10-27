import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { completeSetWithRetry } from "@/applications/usecases/game/complete-set-with-retry";
import { deriveSetCompletion } from "@/applications/usecases/game/derive-set-completion";
import { NotFoundError, GameReason } from "@/entities/errors";
import type { Entry, EntryContent } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IRecordEntriesInput {
  params: { gameId: string; setIndex: number };
  data: (EntryContent & { at: Date })[];
}

export type IRecordEntriesOutput = {
  entries: Entry[];
  setCompletionConfirmed?: boolean;
};

export interface IRecordEntriesUseCase {
  execute(input: IRecordEntriesInput): Promise<IRecordEntriesOutput>;
}

/**
 * Creating an entry, resending it and editing it write through the same
 * upsert-by-identity repository operation, whatever the entry's type:
 * whichever entries the client sends land at their identity, new or existing.
 */
@injectable()
export class RecordEntriesUseCase implements IRecordEntriesUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(input: IRecordEntriesInput): Promise<IRecordEntriesOutput> {
    const { params, data } = input;
    const { gameId, setIndex } = params;
    const user = await this.authenticationService.verifySession();

    // Read for the team the caller must belong to; whether the set exists is
    // the write's own condition.
    const game = await this.gameRepository.findById(gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    const operator = await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const entries = await this.gameRepository.upsertEntry(
      { gameId, setIndex },
      data.map(({ at, ...entry }) => ({ entry, at })),
      operator.id,
    );

    const completion = deriveSetCompletion(game, setIndex, entries);
    if (!completion) return { entries };

    // The entries are already persisted at this point. A failing set-result
    // write must not throw past that and discard them — the client is told
    // its entries landed and that the result needs a retry, not that nothing
    // happened. completeSetWithRetry absorbs transient failures inline
    // before the response goes out; only a failure that survives every
    // attempt is reported as unconfirmed.
    const setCompletionConfirmed = await completeSetWithRetry(
      this.gameRepository,
      { gameId, setIndex },
      completion.win,
      completion.gameWin,
    );
    return { entries, setCompletionConfirmed };
  }
}
