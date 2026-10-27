import {
  type IRecordEntriesInput,
  type IRecordEntriesOutput,
  type IRecordEntriesUseCase,
} from "@/applications/usecases/game/record-entries.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const recordEntriesController = async (
  input: IRecordEntriesInput,
): Promise<IRecordEntriesOutput> => {
  const useCase = container.get<IRecordEntriesUseCase>(
    TYPES.RecordEntriesUseCase,
  );
  return await useCase.execute(input);
};
