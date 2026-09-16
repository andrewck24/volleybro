import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { PlayerRole } from "@/entities/player";
import type { Team } from "@/entities/team";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetTeamInput {
  teamId: string;
  userId: string;
}

export interface IGetTeamUseCase {
  execute(input: IGetTeamInput): Promise<Team | null>;
}

@injectable()
export class GetTeamUseCase implements IGetTeamUseCase {
  constructor(
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute({ teamId, userId }: IGetTeamInput): Promise<Team | null> {
    await this.authorizationService.verifyTeamRole(
      teamId,
      userId,
      PlayerRole.MEMBER,
    );
    return this.teamRepository.findById(teamId);
  }
}
