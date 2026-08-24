import {
  createGame,
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockGameRepository,
  createUser,
} from "@/__tests__/helpers";
import { CreateSubstitutionUseCase } from "@/applications/usecases/game/create-substitution.usecase";
import { NotFoundError } from "@/entities/errors";
import { Side, type EntryIdentity, type Substitution } from "@/entities/game";
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

describe("CreateSubstitutionUseCase", () => {
  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);
    const useCase = new CreateSubstitutionUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Substitution & EntryIdentity,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when set not found", async () => {
    mockGameRepository.findById.mockResolvedValue({
      ...createGame(),
      sets: [],
    });
    const useCase = new CreateSubstitutionUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Substitution & EntryIdentity,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the substitution players are not in the lineup", async () => {
    mockGameRepository.findById.mockResolvedValue(createGame());
    const useCase = new CreateSubstitutionUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 1 },
        data: { team: Side.HOME, players: { in: "p-in", out: "p-out" }, id: "entry-1", seq: 1 },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
