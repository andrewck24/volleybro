import { injectable, inject } from "inversify";
import { TYPES } from "@/infrastructure/di/types";
import type { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { RecordReason } from "@/entities/errors/reasons/record";
import {
  type Record,
  type Set,
  PlayerStatsClass,
  TeamStatsClass,
} from "@/entities/record";
import { type Lineup } from "@/entities/team";
import { PlayerRole } from "@/entities/player";

export interface ICreateSetInput {
  params: { recordId: string; setIndex: number };
  data: {
    lineup: Lineup;
    options: Set["options"];
  };
}

export interface ICreateSetOutput extends Record {}

@injectable()
export class CreateSetUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(input: ICreateSetInput): Promise<ICreateSetOutput | undefined> {
    const { params, data } = input;
    const user = await this.authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: params.recordId,
    });
    if (!record) throw new NotFoundError(RecordReason.RECORD_NOT_FOUND, "Record not found");

    await this.authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
       PlayerRole.MEMBER
    );

    // 新增上場選手(在 lineups 中)對應局數的 stats 物件（在開新局、換人時）
    const startingPlayers = data.lineup.starting.map((player) => player._id);
    const liberoPlayers = data.lineup.liberos.map((player) => player._id);
    const activePlayerIds = new Set([...startingPlayers, ...liberoPlayers]);

    record.teams.home.players.forEach((player) => {
      if (activePlayerIds.has(player._id.toString())) {
        player.stats[params.setIndex] = new PlayerStatsClass();
      }
    });
    record.teams.home.stats[params.setIndex] = new TeamStatsClass();
    record.teams.away.stats[params.setIndex] = new TeamStatsClass();

    if (params.setIndex === 0) delete record.teams.home.lineup;

    record.sets[params.setIndex] = {
      win: null,
      lineups: { home: data.lineup },
      options: data.options,
      entries: [],
    };

    const updatedRecord = await this.recordRepository.update(
      { _id: params.recordId },
      record
    );

    return updatedRecord;
  }
}

export interface IUpdateSetInput {
  params: { recordId: string; setIndex: number };
  data: {
    // lineup: Lineup;
    options: Set["options"];
  };
}

export interface IUpdateSetOutput extends Record {}

@injectable()
export class UpdateSetUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(input: IUpdateSetInput): Promise<IUpdateSetOutput | undefined> {
    const { params, data } = input;
    const user = await this.authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: params.recordId,
    });
    if (!record) throw new NotFoundError(RecordReason.RECORD_NOT_FOUND, "Record not found");

    await this.authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
       PlayerRole.MEMBER
    );

    record.sets[params.setIndex].options = data.options;
    // TODO: new feature: update lineup of the set (without increasing substitution count)

    const updatedRecord = await this.recordRepository.update(
      { _id: params.recordId },
      record
    );

    return updatedRecord;
  }
}
