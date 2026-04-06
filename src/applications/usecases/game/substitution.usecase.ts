import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { GameReason } from "@/entities/errors/reasons/game";
import {
  type Entry,
  type Game,
  type Substitution,
  PlayerStatsClass,
  Side,
  createSubstitutionEntry,
} from "@/entities/game";
import { PlayerRole } from "@/entities/player";
import { type Lineup } from "@/entities/team";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ICreateSubstitutionInput {
  params: { gameId: string; setIndex: number; entryIndex: number };
  data: Substitution;
}

export type ICreateSubstitutionOutput = Entry[];

@injectable()
export class CreateSubstitutionUseCase {
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
    const { params, data: substitution } = input;
    const user = await this.authenticationService.verifySession();

    const game = await this.gameRepository.findOne({
      id: params.gameId,
    });
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const side = substitution.team === Side.HOME ? "home" : "away";
    const lineup = game.sets[params.setIndex].lineups[side];
    if (!lineup)
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Lineup not found");

    this.updateLineup(lineup, substitution, params.entryIndex);
    this.updateGameStats(game, side, input);

    await this.gameRepository.update({ id: params.gameId }, game);
    return game.sets[params.setIndex].entries;
  }

  private updateLineup(
    lineup: Lineup,
    substitution: Substitution,
    entryIndex: number,
  ) {
    const startingIndex = lineup.starting.findIndex(
      (p) => p.id?.toString() === substitution.players.out,
    );
    const subIndex = lineup.substitutes.findIndex(
      (p) => p.id?.toString() === substitution.players.in,
    );

    lineup.starting[startingIndex] = {
      id: substitution.players.in,
      position: lineup.starting[startingIndex].position,
      sub: {
        id: substitution.players.out,
        entryIndex:
          lineup.starting[startingIndex].sub?.entryIndex?.in !== undefined
            ? {
                ...lineup.starting[startingIndex].sub.entryIndex,
                out: entryIndex,
              }
            : { in: entryIndex },
      },
    };

    lineup.substitutes[subIndex] = {
      ...lineup.substitutes[subIndex],
      id: substitution.players.out,
      sub: {
        id: substitution.players.in,
        entryIndex:
          lineup.substitutes[subIndex].sub?.entryIndex?.in !== undefined
            ? {
                ...lineup.substitutes[subIndex].sub.entryIndex,
                out: entryIndex,
              }
            : { in: entryIndex },
      },
    };
  }

  private updateGameStats(
    game: Game,
    side: "home" | "away",
    input: ICreateSubstitutionInput,
  ) {
    const {
      params: { setIndex, entryIndex },
      data: substitution,
    } = input;
    const lineup = game.sets[setIndex].lineups[side];
    if (!lineup) return;

    const startingPlayer = lineup.starting.find(
      (p) => p.id?.toString() === substitution.players.in,
    );
    if (startingPlayer?.sub?.entryIndex?.in !== undefined) {
      const player = game.teams[side].players.find(
        (p) => p.id?.toString() === substitution.players.in,
      );
      if (player) player.stats[setIndex] = new PlayerStatsClass();
    }

    game.teams[side].stats[setIndex].substitution++;
    game.sets[setIndex].entries[entryIndex] =
      createSubstitutionEntry(substitution);
  }
}
