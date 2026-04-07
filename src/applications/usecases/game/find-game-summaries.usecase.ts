import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { GameSummary } from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IFindGameSummariesInput {
  params: { teamId: string; lastId?: string; limit?: number };
}

export type IFindGameSummariesOutput = {
  gameSummaries: GameSummary[];
  hasMore: boolean;
  lastId: string;
};

export interface IFindGameSummariesUseCase {
  execute(
    input: IFindGameSummariesInput,
  ): Promise<IFindGameSummariesOutput | undefined>;
}

@injectable()
export class FindGameSummariesUseCase implements IFindGameSummariesUseCase {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: IGameRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(
    input: IFindGameSummariesInput,
  ): Promise<IFindGameSummariesOutput | undefined> {
    const { params } = input;
    const user = await this.authenticationService.verifySession();

    await this.authorizationService.verifyTeamRole(
      params.teamId,
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const results = await this.gameRepository.findGameSummaries(params.teamId, {
      lastId: params.lastId,
    });

    const { data: gameSummaries, hasMore, lastId } = results;

    return {
      gameSummaries,
      hasMore,
      lastId,
    };
  }
}
