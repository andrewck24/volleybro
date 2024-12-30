import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import { AuthenticationService } from "@/infrastructure/service/auth/authentication.service";
import { AuthorizationService } from "@/infrastructure/service/auth/authorization.service";
import { updateRallyOptimistic as updateRally } from "@/lib/features/record/helpers";
import { type Entry, type Rally } from "@/entities/record";
import { Role } from "@/entities/team";

export type IUpdateRallyInput = {
  params: { recordId: string; setIndex: number; rallyIndex: number };
  data: Rally;
};

export type IUpdateRallyOutput = Entry[];

export class UpdateRallyUseCase {
  constructor(
    private userRepository: IUserRepository,
    private teamRepository: ITeamRepository,
    private recordRepository: IRecordRepository
  ) {}

  async execute(
    input: IUpdateRallyInput
  ): Promise<IUpdateRallyOutput | undefined> {
    const { params, data: rally } = input;
    const authenticationService = new AuthenticationService(
      this.userRepository
    );
    const user = await authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: params.recordId,
    });
    if (!record) throw new Error("Record not found");

    const authorizationService = new AuthorizationService(this.teamRepository);
    await authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
      Role.MEMBER
    );

    const set = record.sets[params.setIndex];
    if (!set) throw new Error("Set not found");

    const updatedRecord = updateRally(params, rally, record);

    await this.recordRepository.update({ _id: record._id }, updatedRecord);

    return updatedRecord.sets[params.setIndex].rallies;
  }
}
