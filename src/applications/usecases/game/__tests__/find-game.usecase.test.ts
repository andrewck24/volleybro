import {
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockGameRepository,
  createUser,
} from "@/__tests__/helpers";
import { FindGameUseCase } from "@/applications/usecases/game/find-game.usecase";
import { NotFoundError } from "@/entities/errors";
import { beforeEach, describe, expect, it } from "@jest/globals";

let mockGameRepository: ReturnType<typeof createMockGameRepository>;
let mockAuthService: ReturnType<typeof createMockAuthenticationService>;
let mockAuthzService: ReturnType<typeof createMockAuthorizationService>;

beforeEach(() => {
  mockGameRepository = createMockGameRepository();
  mockAuthService = createMockAuthenticationService();
  mockAuthzService = createMockAuthorizationService();
  mockAuthService.verifySession.mockResolvedValue(createUser());
  mockAuthzService.verifyTeamRole.mockResolvedValue(undefined);
});

describe("FindGameUseCase", () => {
  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);
    const useCase = new FindGameUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({ params: { id: "game-1" } }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
