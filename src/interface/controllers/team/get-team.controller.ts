import type { IGetTeamUseCase } from "@/applications/usecases/team/get-team.usecase";
import type { Team } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const getTeamController = async (
  teamId: string,
): Promise<Team | null> => {
  const useCase = container.get<IGetTeamUseCase>(TYPES.GetTeamUseCase);
  return await useCase.execute(teamId);
};
