import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import { AuthenticationService } from "@/infrastructure/service/auth/authentication.service";
import { AuthorizationService } from "@/infrastructure/service/auth/authorization.service";
import {
  type Record,
  type Entry,
  type Substitution,
  Side,
  EntryType,
  PlayerStatsClass,
} from "@/entities/record";
import { Role, type Lineup } from "@/entities/team";

export interface ICreateSubstitutionInput {
  params: { recordId: string; setIndex: number; rallyIndex: number };
  data: Substitution;
}

export type ICreateSubstitutionOutput = Entry[];

export class CreateSubstitutionUseCase {
  constructor(
    private userRepository: IUserRepository,
    private teamRepository: ITeamRepository,
    private recordRepository: IRecordRepository
  ) {}

  async execute(
    input: ICreateSubstitutionInput
  ): Promise<ICreateSubstitutionOutput> {
    const { params, data: substitution } = input;
    const user = await new AuthenticationService(
      this.userRepository
    ).verifySession();

    const record = await this.recordRepository.findOne({
      _id: params.recordId,
    });
    if (!record) throw new Error("Record not found");

    await new AuthorizationService(this.teamRepository).verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
      Role.MEMBER
    );

    const side = substitution.team === Side.HOME ? "home" : "away";
    const lineup = record.sets[params.setIndex].lineups[side];

    this.updateLineup(lineup, substitution, params.rallyIndex);
    this.updateRecordStats(record, side, input);

    await this.recordRepository.update({ _id: params.recordId }, record);
    return record.sets[params.setIndex].entries;
  }

  private updateLineup(
    lineup: Lineup,
    substitution: Substitution,
    rallyIndex: number
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
        rallyIndex:
          lineup.starting[startingIndex].sub?.rallyIndex?.in !== undefined
            ? {
                ...lineup.starting[startingIndex].sub.rallyIndex,
                out: rallyIndex,
              }
            : { in: rallyIndex, out: null },
      },
    };

    lineup.substitutes[subIndex] = {
      ...lineup.substitutes[subIndex],
      _id: substitution.players.out,
      sub: {
        _id: substitution.players.in,
        rallyIndex:
          lineup.substitutes[subIndex].sub?.rallyIndex?.in !== undefined
            ? {
                ...lineup.substitutes[subIndex].sub.rallyIndex,
                out: rallyIndex,
              }
            : { in: rallyIndex, out: null },
      },
    };
  }

  private updateRecordStats(
    record: Record,
    side: string,
    input: ICreateSubstitutionInput
  ) {
    const {
      params: { setIndex, rallyIndex },
      data: substitution,
    } = input;
    const lineup = record.sets[setIndex].lineups[side];

    const startingPlayer = lineup.starting.find(
      (p) => p._id.toString() === substitution.players.in
    );
    if (!!startingPlayer.sub?.rallyIndex?.in !== undefined) {
      const player = record.teams[side].players.find(
        (p) => p._id.toString() === substitution.players.in
      );
      if (player) player.stats[setIndex] = new PlayerStatsClass();
    }

    record.teams[side].stats[setIndex].substitution++;
    record.sets[setIndex].entries[rallyIndex] = {
      type: EntryType.SUBSTITUTION,
      data: substitution,
    };
  }
}
