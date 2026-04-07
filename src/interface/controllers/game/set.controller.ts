import {
  type ICreateSetInput,
  type ICreateSetOutput,
  type ICreateSetUseCase,
} from "@/applications/usecases/game/create-set.usecase";
import {
  type IUpdateSetInput,
  type IUpdateSetOutput,
  type IUpdateSetUseCase,
} from "@/applications/usecases/game/update-set.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const createSetController = async (
  input: ICreateSetInput,
): Promise<ICreateSetOutput | undefined> => {
  const useCase = container.get<ICreateSetUseCase>(TYPES.CreateSetUseCase);
  return await useCase.execute(input);
};

export const updateSetController = async (
  input: IUpdateSetInput,
): Promise<IUpdateSetOutput | undefined> => {
  const useCase = container.get<IUpdateSetUseCase>(TYPES.UpdateSetUseCase);
  return await useCase.execute(input);
};
