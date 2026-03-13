import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { SearchUserUseCase, SearchUserOutput } from "@/applications/usecases/user/search-user.usecase";
import type { GetUserByIdUseCase } from "@/applications/usecases/user/get-user-by-id.usecase";
import type { Result } from "@/applications/types/result";

/**
 * Get user by ID or search by email.
 * - email provided → SearchUserUseCase (exact match, returns { _id, name, image })
 * - no email       → GetUserByIdUseCase with actorId (self-lookup or lookup by id passed from route)
 * Route layer resolves actorId from session and passes id/email from query params.
 */
export const getUserController = async (
  actorId?: string,
  email?: string | null,
): Promise<Result<SearchUserOutput>> => {
  if (email) {
    const useCase = container.get<SearchUserUseCase>(TYPES.SearchUserUseCase);
    return useCase.execute(email);
  }

  const targetId = actorId;
  const useCase = container.get<GetUserByIdUseCase>(TYPES.GetUserByIdUseCase);
  return useCase.execute(targetId);
};
