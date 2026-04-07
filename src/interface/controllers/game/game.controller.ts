import {
  type ICreateGameInput,
  type ICreateGameOutput,
  type ICreateGameUseCase,
} from "@/applications/usecases/game/create-game.usecase";
import {
  type IFindGameInput,
  type IFindGameOutput,
  type IFindGameUseCase,
} from "@/applications/usecases/game/find-game.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const findGameController = async (
  input: IFindGameInput,
): Promise<IFindGameOutput | undefined> => {
  const useCase = container.get<IFindGameUseCase>(TYPES.FindGameUseCase);
  return await useCase.execute(input);
};

export const createGameController = async (
  input: ICreateGameInput,
): Promise<ICreateGameOutput | undefined> => {
  const useCase = container.get<ICreateGameUseCase>(TYPES.CreateGameUseCase);
  return await useCase.execute(input);
};
