import {
  CreateGameUseCase,
  FindGameUseCase,
  type ICreateGameInput,
  type ICreateGameOutput,
  type IFindGameInput,
  type IFindGameOutput,
} from "@/applications/usecases/game/game.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const findGameController = async (
  input: IFindGameInput,
): Promise<IFindGameOutput | undefined> => {
  const findGameUseCase = container.get<FindGameUseCase>(TYPES.FindGameUseCase);

  return await findGameUseCase.execute(input);
};

export const createGameController = async (
  input: ICreateGameInput,
): Promise<ICreateGameOutput | undefined> => {
  const createGameUseCase = container.get<CreateGameUseCase>(
    TYPES.CreateGameUseCase,
  );

  return await createGameUseCase.execute(input);
};
