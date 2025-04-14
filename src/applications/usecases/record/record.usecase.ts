import { injectable, inject } from "inversify";
import { TYPES } from "@/infrastructure/di/types";
import type { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { Record } from "@/entities/record";
import { Role } from "@/entities/team";

export interface IFindRecordInput {
  params: { _id: string };
}

export type IFindRecordOutput = Record;

@injectable()
export class FindRecordUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(
    input: IFindRecordInput
  ): Promise<IFindRecordOutput | undefined> {
    const { params } = input;
    const user = await this.authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: params._id,
    });

    await this.authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
      Role.MEMBER
    );

    return record;
  }
}

export interface ICreateRecordInput {
  params: { teamId: string };
  data: {
    info: Record["info"];
    teams: Record["teams"];
  };
}

export interface ICreateRecordOutput extends Record {}

@injectable()
export class CreateRecordUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(
    input: ICreateRecordInput
  ): Promise<ICreateRecordOutput | undefined> {
    const { params, data } = input;
    const user = await this.authenticationService.verifySession();

    await this.authorizationService.verifyTeamRole(
      params.teamId.toString(),
      user._id.toString(),
      Role.MEMBER
    );

    const record = await this.recordRepository.create({
      win: null,
      team_id: params.teamId,
      info: data.info,
      teams: { home: { ...data.teams.home }, away: { ...data.teams.away } },
    });

    return record;
  }
}
