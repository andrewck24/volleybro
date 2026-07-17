import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { Lineup } from "@/entities/team";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IUpdateTeamLineupsUseCase {
  execute(teamId: string, lineups: Lineup[]): Promise<Lineup[]>;
}

@injectable()
export class UpdateTeamLineupsUseCase implements IUpdateTeamLineupsUseCase {
  constructor(
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
  ) {}

  async execute(teamId: string, lineups: Lineup[]): Promise<Lineup[]> {
    return this.teamRepository.updateLineups(teamId, lineups);
  }
}
