import type {
  ICreateTeamInput,
  ICreateTeamUseCase,
} from "@/applications/usecases/team/create-team.usecase";
import type { Team } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const createTeamController = async (
  input: ICreateTeamInput,
): Promise<Team> => {
  const useCase = container.get<ICreateTeamUseCase>(TYPES.CreateTeamUseCase);
  return await useCase.execute(input);
};
