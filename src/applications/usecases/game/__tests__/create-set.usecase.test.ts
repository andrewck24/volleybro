import {
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockGameRepository,
  createUser,
} from "@/__tests__/helpers";
import { CreateSetUseCase } from "@/applications/usecases/game/create-set.usecase";
import { NotFoundError } from "@/entities/errors";
import { Set } from "@/entities/game";
import { Lineup } from "@/entities/team";
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

describe("CreateSetUseCase", () => {
  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);
    const useCase = new CreateSetUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: {
          lineup: {} as unknown as Lineup,
          options: {} as unknown as Set["options"],
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
