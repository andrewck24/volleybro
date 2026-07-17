import type { IUpdateTeamLineupsUseCase } from "@/applications/usecases/team/update-team-lineups.usecase";
import type { Lineup } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const updateTeamLineupsController = async (
  teamId: string,
  lineups: Lineup[],
): Promise<Lineup[]> => {
  const useCase = container.get<IUpdateTeamLineupsUseCase>(
    TYPES.UpdateTeamLineupsUseCase,
  );
  return await useCase.execute(teamId, lineups);
};
