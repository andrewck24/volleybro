import { injectable, inject } from "inversify";
import { TYPES } from "@/infrastructure/di/types";
import type { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  createRallyHelper,
  updateRallyHelper,
} from "@/lib/features/record/helpers";
import { Role } from "@/entities/team";
import type { Entry, Rally } from "@/entities/record";

export interface ICreateRallyInput {
  params: { recordId: string; setIndex: number; entryIndex: number };
  data: Rally;
}

export type ICreateRallyOutput = Entry[];

@injectable()
export class CreateRallyUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(
    input: ICreateRallyInput
  ): Promise<ICreateRallyOutput | undefined> {
    const { params, data: rally } = input;
    const { recordId, setIndex } = params;
    const user = await this.authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: recordId,
    });
    if (!record) throw new Error("Record not found");
    if (!record.sets[setIndex]) throw new Error("Set not found");

    await this.authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
      Role.MEMBER
    );

    // TODO: handle race condition
    // 若傳入的 setIndex, (entryIndex), scores, type, num 一致時，則視為同筆資料不新增
    // 若 setIndex, score 等資料不同時，通知後傳入之使用者，令其選擇合適之紀錄，或新增於前者紀錄之後（如何更新前者之資料？）

    const { record: updatedRecord } = createRallyHelper(params, rally, record);

    await this.recordRepository.update({ _id: recordId }, updatedRecord);

    return record.sets[setIndex].entries;
  }
}

export type IUpdateRallyInput = {
  params: { recordId: string; setIndex: number; entryIndex: number };
  data: Rally;
};

export type IUpdateRallyOutput = Entry[];

@injectable()
export class UpdateRallyUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(
    input: IUpdateRallyInput
  ): Promise<IUpdateRallyOutput | undefined> {
    const { params, data: rally } = input;
    const user = await this.authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: params.recordId,
    });
    if (!record) throw new Error("Record not found");
    if (!record.sets[params.setIndex]) throw new Error("Set not found");

    await this.authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
      Role.MEMBER
    );

    const { record: updatedRecord } = updateRallyHelper(params, rally, record);

    await this.recordRepository.update({ _id: record._id }, updatedRecord);

    return updatedRecord.sets[params.setIndex].entries;
  }
}
