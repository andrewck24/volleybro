import {
  FindGameSummariesUseCase,
  type IFindGameSummariesInput,
  type IFindGameSummariesOutput,
} from "@/applications/usecases/game/game-summaries.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const findGameSummariesController = async (
  input: IFindGameSummariesInput,
): Promise<IFindGameSummariesOutput | undefined> => {
  const useCase = container.get<FindGameSummariesUseCase>(
    TYPES.FindGameSummariesUseCase,
  );
  return await useCase.execute(input);
};
