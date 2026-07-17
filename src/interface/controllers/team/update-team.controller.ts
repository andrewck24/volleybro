import type { IUpdateTeamUseCase } from "@/applications/usecases/team/update-team.usecase";
import type { Team } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const updateTeamController = async (
  teamId: string,
  updates: Partial<Team>,
): Promise<Team> => {
  const useCase = container.get<IUpdateTeamUseCase>(TYPES.UpdateTeamUseCase);
  return await useCase.execute(teamId, updates);
};
