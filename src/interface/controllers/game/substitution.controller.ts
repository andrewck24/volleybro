import {
  CreateSubstitutionUseCase,
  type ICreateSubstitutionInput,
  type ICreateSubstitutionOutput,
} from "@/applications/usecases/game/substitution.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const createSubstitutionController = async (
  input: ICreateSubstitutionInput,
): Promise<ICreateSubstitutionOutput | undefined> => {
  const createSubstitutionUseCase = container.get<CreateSubstitutionUseCase>(
    TYPES.CreateSubstitutionUseCase,
  );

  return await createSubstitutionUseCase.execute(input);
};
