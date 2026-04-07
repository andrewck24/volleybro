import {
  type ICreateSubstitutionInput,
  type ICreateSubstitutionOutput,
  type ICreateSubstitutionUseCase,
} from "@/applications/usecases/game/create-substitution.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const createSubstitutionController = async (
  input: ICreateSubstitutionInput,
): Promise<ICreateSubstitutionOutput | undefined> => {
  const useCase = container.get<ICreateSubstitutionUseCase>(
    TYPES.CreateSubstitutionUseCase,
  );
  return await useCase.execute(input);
};
