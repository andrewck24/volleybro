import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, GameReason } from "@/entities/errors";
import {
  type Game,
  type Set,
  type SetLineups,
  upsertEntries,
  validateLineupPlayers,
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

export interface ICreateSetUseCase {
  execute(input: ICreateSetInput): Promise<ICreateSetOutput | undefined>;
}

@injectable()
export class CreateSetUseCase implements ICreateSetUseCase {
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

    validateLineupPlayers(data.lineup, game.teams.home.players ?? []);

    const startingLineups = { home: data.lineup };
    // No entries, so nothing can be refused and the lineups are always derived.
    const { lineups } = upsertEntries({ startingLineups, entries: [] }, [])
      .set as { lineups: SetLineups };
    return this.gameRepository.addSet(
      params,
      {
        win: null,
        startingLineups,
        lineups,
        options: data.options,
        entries: [],
      },
      { clearTeamLineup: params.setIndex === 0 },
    );
  }
}
