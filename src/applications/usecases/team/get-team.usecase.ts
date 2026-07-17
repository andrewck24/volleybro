import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { Team } from "@/entities/team";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetTeamUseCase {
  execute(teamId: string): Promise<Team | null>;
}

@injectable()
export class GetTeamUseCase implements IGetTeamUseCase {
  constructor(
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
  ) {}

  async execute(teamId: string): Promise<Team | null> {
    return this.teamRepository.findById(teamId);
  }
}
