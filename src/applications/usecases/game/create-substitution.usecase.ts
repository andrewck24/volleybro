import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, ValidationError, GameReason } from "@/entities/errors";
import {
  type Entry,
  type EntryIdentity,
  type Substitution,
  createSubstitutionEntry,
  recomputeLineups,
} from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ICreateSubstitutionInput {
  params: { gameId: string; setIndex: number };
  data: Substitution & EntryIdentity & { at: Date };
}

export type ICreateSubstitutionOutput = Entry[];

export interface ICreateSubstitutionUseCase {
  execute(input: ICreateSubstitutionInput): Promise<ICreateSubstitutionOutput>;
}

@injectable()
export class CreateSubstitutionUseCase implements ICreateSubstitutionUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(
    input: ICreateSubstitutionInput,
  ): Promise<ICreateSubstitutionOutput> {
    const { params, data } = input;
    const { at, ...substitution } = data;
    const user = await this.authenticationService.verifySession();

    const game = await this.gameRepository.findById(params.gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    const operator = await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const set = game.sets[params.setIndex];
    if (!set)
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found");

    const entry = createSubstitutionEntry(substitution);
    const { lineups, invalid } = recomputeLineups(set.startingLineups, [
      ...set.entries.filter((e) => e.id !== entry.id),
      entry,
    ]);
    if (invalid)
      throw new ValidationError(
        GameReason.INVALID_SUBSTITUTION,
        "Substitution player not found in lineup",
      );

    return this.gameRepository.upsertEntry(
      { gameId: params.gameId, setIndex: params.setIndex },
      [{ entry, at }],
      operator.id,
      lineups,
    );
  }
}
