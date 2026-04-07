import {
  type ICreateRallyInput,
  type ICreateRallyOutput,
  type ICreateRallyUseCase,
} from "@/applications/usecases/game/create-rally.usecase";
import {
  type IUpdateRallyInput,
  type IUpdateRallyOutput,
  type IUpdateRallyUseCase,
} from "@/applications/usecases/game/update-rally.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const createRallyController = async (
  input: ICreateRallyInput,
): Promise<ICreateRallyOutput | undefined> => {
  const useCase = container.get<ICreateRallyUseCase>(TYPES.CreateRallyUseCase);
  return await useCase.execute(input);
};

export const updateRallyController = async (
  input: IUpdateRallyInput,
): Promise<IUpdateRallyOutput | undefined> => {
  const useCase = container.get<IUpdateRallyUseCase>(TYPES.UpdateRallyUseCase);
  return await useCase.execute(input);
};
