import { injectable, inject } from "inversify";
import { TYPES } from "@/infrastructure/di/types";
import type { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { PlayerRole } from "@/entities/player";
import type { MatchResult } from "@/entities/record";

export interface IFindMatchesInput {
  params: { teamId: string; lastId?: string; limit?: number };
}

export type IFindMatchesOutput = {
  matches: MatchResult[];
  hasMore: boolean;
  lastId: string;
};

@injectable()
export class FindMatchesUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService
  ) {}

  async execute(
    input: IFindMatchesInput
  ): Promise<IFindMatchesOutput | undefined> {
    const { params } = input;
    const user = await this.authenticationService.verifySession();

    await this.authorizationService.verifyTeamRole(
      params.teamId.toString(),
      user._id.toString(),
       PlayerRole.MEMBER
    );

    const results = await this.recordRepository.findMatchesWithPagination(
      { team_id: params.teamId },
      { lastId: params.lastId }
    );

    const { data: matches, hasMore, lastId } = results;

    return {
      matches,
      hasMore,
      lastId,
    };
  }
}
