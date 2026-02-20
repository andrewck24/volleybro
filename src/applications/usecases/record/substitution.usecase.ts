import { injectable, inject } from "inversify";
import { TYPES } from "@/infrastructure/di/types";
import type { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  type Record,
  type Entry,
  type Substitution,
  Side,
  EntryType,
  PlayerStatsClass,
} from "@/entities/record";
import { type Lineup } from "@/entities/team";
import { PlayerRole } from "@/entities/player";

export interface ICreateSubstitutionInput {
  params: { recordId: string; setIndex: number; entryIndex: number };
  data: Substitution;
}

export type ICreateSubstitutionOutput = Entry[];

@injectable()
export class CreateSubstitutionUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(
    input: ICreateSubstitutionInput
  ): Promise<ICreateSubstitutionOutput> {
    const { params, data: substitution } = input;
    const user = await this.authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: params.recordId,
    });
    if (!record) throw new Error("Record not found");

    await this.authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
       PlayerRole.MEMBER
    );

    const side = substitution.team === Side.HOME ? "home" : "away";
    const lineup = record.sets[params.setIndex].lineups[side];

    this.updateLineup(lineup, substitution, params.entryIndex);
    this.updateRecordStats(record, side, input);

    await this.recordRepository.update({ _id: params.recordId }, record);
    return record.sets[params.setIndex].entries;
  }

  private updateLineup(
    lineup: Lineup,
    substitution: Substitution,
    entryIndex: number
  ) {
    const startingIndex = lineup.starting.findIndex(
      (p) => p._id.toString() === substitution.players.out
    );
    const subIndex = lineup.substitutes.findIndex(
      (p) => p._id.toString() === substitution.players.in
    );

    lineup.starting[startingIndex] = {
      _id: substitution.players.in,
      position: lineup.starting[startingIndex].position,
      sub: {
        _id: substitution.players.out,
        entryIndex:
          lineup.starting[startingIndex].sub?.entryIndex?.in !== undefined
            ? {
                ...lineup.starting[startingIndex].sub.entryIndex,
                out: entryIndex,
              }
            : { in: entryIndex, out: null },
      },
    };

    lineup.substitutes[subIndex] = {
      ...lineup.substitutes[subIndex],
      _id: substitution.players.out,
      sub: {
        _id: substitution.players.in,
        entryIndex:
          lineup.substitutes[subIndex].sub?.entryIndex?.in !== undefined
            ? {
                ...lineup.substitutes[subIndex].sub.entryIndex,
                out: entryIndex,
              }
            : { in: entryIndex, out: null },
      },
    };
  }

  private updateRecordStats(
    record: Record,
    side: string,
    input: ICreateSubstitutionInput
  ) {
    const {
      params: { setIndex, entryIndex },
      data: substitution,
    } = input;
    const lineup = record.sets[setIndex].lineups[side];

    const startingPlayer = lineup.starting.find(
      (p) => p._id.toString() === substitution.players.in
    );
    if (!!startingPlayer.sub?.entryIndex?.in !== undefined) {
      const player = record.teams[side].players.find(
        (p) => p._id.toString() === substitution.players.in
      );
      if (player) player.stats[setIndex] = new PlayerStatsClass();
    }

    record.teams[side].stats[setIndex].substitution++;
    record.sets[setIndex].entries[entryIndex] = {
      type: EntryType.SUBSTITUTION,
      data: substitution,
    };
  }
}
