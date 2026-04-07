import type { Result } from "@/applications/types/result";
import type {
  IGetUserByIdInput,
  IGetUserByIdUseCase,
} from "@/applications/usecases/user/get-user-by-id.usecase";
import type {
  ISearchUserInput,
  ISearchUserOutput,
  ISearchUserUseCase,
} from "@/applications/usecases/user/search-user.usecase";
import type { User } from "@/entities/user";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

/**
 * Search user by email.
 * Route layer validates and passes search criteria.
 */
export const searchUserController = async (
  input: ISearchUserInput,
): Promise<Result<ISearchUserOutput>> => {
  const useCase = container.get<ISearchUserUseCase>(TYPES.SearchUserUseCase);
  return useCase.execute(input);
};

/**
 * Get user by ID.
 * Route layer resolves current user identity and passes it in.
 */
export const getUserByIdController = async (
  input: IGetUserByIdInput,
): Promise<Result<User>> => {
  const useCase = container.get<IGetUserByIdUseCase>(TYPES.GetUserByIdUseCase);
  return useCase.execute(input);
};
