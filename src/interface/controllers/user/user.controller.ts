import type { Result } from "@/applications/types/result";
import type { GetUserByIdUseCase } from "@/applications/usecases/user/get-user-by-id.usecase";
import type {
  SearchUserOutput,
  SearchUserUseCase,
} from "@/applications/usecases/user/search-user.usecase";
import { AuthenticationError } from "@/entities/errors/app-error";
import { AuthReason } from "@/entities/errors/reasons/auth";
import type { User } from "@/entities/user";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

/**
 * Get user by ID or search by email.
 * - email provided → SearchUserUseCase (exact match, returns { id, name, image })
 * - no email       → GetUserByIdUseCase with actorId (self-lookup, returns full User)
 * Route layer resolves actorId from session and passes id/email from query params.
 */
export const getUserController = async (
  actorId?: string,
  email?: string | null,
): Promise<Result<User | SearchUserOutput>> => {
  if (email) {
    const useCase = container.get<SearchUserUseCase>(TYPES.SearchUserUseCase);
    return useCase.execute(email);
  }

  if (!actorId) {
    throw new AuthenticationError(
      AuthReason.SESSION_REQUIRED,
      "Actor ID is required to look up user",
    );
  }
  const useCase = container.get<GetUserByIdUseCase>(TYPES.GetUserByIdUseCase);
  return useCase.execute(actorId);
};
