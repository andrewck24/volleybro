import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { Team } from "@/entities/team";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IUpdateTeamUseCase {
  execute(teamId: string, updates: Partial<Team>): Promise<Team>;
}

@injectable()
export class UpdateTeamUseCase implements IUpdateTeamUseCase {
  constructor(
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
  ) {}

  async execute(teamId: string, updates: Partial<Team>): Promise<Team> {
    return this.teamRepository.update(teamId, updates);
  }
}
