import {
  type IRecordRalliesInput,
  type IRecordRalliesOutput,
  type IRecordRalliesUseCase,
} from "@/applications/usecases/game/record-rallies.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const recordRalliesController = async (
  input: IRecordRalliesInput,
): Promise<IRecordRalliesOutput> => {
  const useCase = container.get<IRecordRalliesUseCase>(
    TYPES.RecordRalliesUseCase,
  );
  return await useCase.execute(input);
};
