import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import {
  GetProfileUseCase,
  CreateProfileUseCase,
  UpdateProfileUseCase,
  type IGetProfileInput,
  type IGetProfileOutput,
  type ICreateProfileInput,
  type IUpdateProfileInput,
  type IUpdateProfileOutput,
} from "@/applications/usecases/user/profile.usecase";
import type { Profile } from "@/entities/profile";

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
): Promise<Profile> => {
  const createProfileUseCase = container.get<CreateProfileUseCase>(
    TYPES.CreateProfileUseCase,
  );
  return await createProfileUseCase.execute(input);
};

export const updateProfileController = async (
  input: IUpdateProfileInput,
): Promise<IUpdateProfileOutput> => {
  const updateProfileUseCase = container.get<UpdateProfileUseCase>(
    TYPES.UpdateProfileUseCase,
  );
  return await updateProfileUseCase.execute(input);
};
