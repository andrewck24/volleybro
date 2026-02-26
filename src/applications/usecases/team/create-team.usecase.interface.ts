import type { Team } from "@/entities/team";

export interface CreateTeamInput {
  name: string;
  nickname?: string;
}

export interface ICreateTeamUseCase {
  execute(input: CreateTeamInput, userId: string, userName: string): Promise<Team>;
}
