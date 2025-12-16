import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import {
  GetProfileUseCase,
  CreateProfileUseCase,
  UpdateProfileUseCase,
  type IGetProfileInput,
  type IGetProfileOutput,
  type ICreateProfileInput,
  type ICreateProfileOutput,
  type IUpdateProfileInput,
  type IUpdateProfileOutput,
} from "@/applications/usecases/user/profile.usecase";

export const getProfileController = async (
  input: IGetProfileInput,
): Promise<IGetProfileOutput> => {
  const getProfileUseCase = container.get<GetProfileUseCase>(
    TYPES.GetProfileUseCase,
  );
  return await getProfileUseCase.execute(input);
};

export const createProfileController = async (
  input: ICreateProfileInput,
): Promise<ICreateProfileOutput | undefined> => {
  try {
    const createProfileUseCase = container.get<CreateProfileUseCase>(
      TYPES.CreateProfileUseCase,
    );
    return await createProfileUseCase.execute(input);
  } catch (error) {
    console.error("[createProfileController] Failed to create profile:", error);
    return undefined;
  }
};

export const updateProfileController = async (
  input: IUpdateProfileInput,
): Promise<IUpdateProfileOutput> => {
  const updateProfileUseCase = container.get<UpdateProfileUseCase>(
    TYPES.UpdateProfileUseCase,
  );
  return await updateProfileUseCase.execute(input);
};