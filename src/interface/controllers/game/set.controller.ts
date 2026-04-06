import {
  CreateSetUseCase,
  UpdateSetUseCase,
  type ICreateSetInput,
  type ICreateSetOutput,
  type IUpdateSetInput,
  type IUpdateSetOutput,
} from "@/applications/usecases/game/set.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const createSetController = async (
  input: ICreateSetInput,
): Promise<ICreateSetOutput | undefined> => {
  const createSetUseCase = container.get<CreateSetUseCase>(
    TYPES.CreateSetUseCase,
  );

  return await createSetUseCase.execute(input);
};

export const updateSetController = async (
  input: IUpdateSetInput,
): Promise<IUpdateSetOutput | undefined> => {
  const updateSetUseCase = container.get<UpdateSetUseCase>(
    TYPES.UpdateSetUseCase,
  );

  return await updateSetUseCase.execute(input);
};
