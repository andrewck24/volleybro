import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, GameReason } from "@/entities/errors";
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
    const { params, data: substitution } = input;
    const user = await this.authenticationService.verifySession();

    const game = await this.gameRepository.findById(params.gameId);
    if (!game)
      throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");

    await this.authorizationService.verifyTeamRole(
      game.teamId.toString(),
      user.id.toString(),
      PlayerRole.MEMBER,
    );

    const set = game.sets[params.setIndex];
    if (!set)
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found");

    const side = substitution.team === Side.HOME ? "home" : "away";
    const lineup = set.lineups[side];
    if (!lineup)
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Lineup not found");

    this.updateLineup(lineup, substitution, params.entryIndex);
    this.updateGameStats(game, side, input);

    const persistedGame = await this.gameRepository.update(params.gameId, game);
    const persistedSet = persistedGame.sets[params.setIndex];
    if (!persistedSet)
      throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found");
    return persistedSet.entries;
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

    const startingPlayer = lineup.starting[startingIndex];
    const subPlayer = lineup.substitutes[subIndex];
    if (!startingPlayer || !subPlayer)
      throw new NotFoundError(
        GameReason.SET_NOT_FOUND,
        "Substitution player not found in lineup",
      );

    lineup.starting[startingIndex] = {
      id: substitution.players.in,
      position: startingPlayer.position,
      sub: {
        id: substitution.players.out,
        entryIndex:
          startingPlayer.sub?.entryIndex?.in !== undefined
            ? {
                ...startingPlayer.sub.entryIndex,
                out: entryIndex,
              }
            : { in: entryIndex },
      },
    };

    lineup.substitutes[subIndex] = {
      ...subPlayer,
      id: substitution.players.out,
      sub: {
        id: substitution.players.in,
        entryIndex:
          subPlayer.sub?.entryIndex?.in !== undefined
            ? {
                ...subPlayer.sub.entryIndex,
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
    const set = game.sets[setIndex];
    if (!set) return;
    const lineup = set.lineups[side];
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

    // stats are seeded alongside the set in create-set; skip rather than throw if absent
    const teamSetStats = game.teams[side].stats[setIndex];
    if (teamSetStats) teamSetStats.substitution++;
    set.entries[entryIndex] = createSubstitutionEntry(substitution);
  }
}
