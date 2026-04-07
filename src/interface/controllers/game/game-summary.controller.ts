import {
  type IFindGameSummariesInput,
  type IFindGameSummariesOutput,
  type IFindGameSummariesUseCase,
} from "@/applications/usecases/game/find-game-summaries.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const findGameSummariesController = async (
  input: IFindGameSummariesInput,
): Promise<IFindGameSummariesOutput | undefined> => {
  const useCase = container.get<IFindGameSummariesUseCase>(
    TYPES.FindGameSummariesUseCase,
  );
  return await useCase.execute(input);
};
