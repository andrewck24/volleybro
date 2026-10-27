import { createGame, createUser } from "@test/support/fixtures/entities";
import {
  createMockAuthenticationService,
  createMockAuthorizationService,
} from "@test/support/doubles/services";
import { createMockGameRepository } from "@test/support/doubles/repositories";
import { CreateSubstitutionUseCase } from "@/applications/usecases/game/create-substitution.usecase";
import { GameReason, NotFoundError } from "@/entities/errors";
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
        params: { gameId: "game-1", setIndex: 0 },
        data: {} as unknown as Substitution & EntryIdentity & { at: Date },
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
        params: { gameId: "game-1", setIndex: 0 },
        data: {} as unknown as Substitution & EntryIdentity & { at: Date },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a substitution whose players do not fit the lineup", async () => {
    mockGameRepository.findById.mockResolvedValue(createGame());
    const useCase = new CreateSubstitutionUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: {
          team: Side.HOME,
          players: { in: "p-in", out: "p-out" },
          id: "entry-1",
          seq: 1,
          at: new Date("2026-03-01T10:00:00.000Z"),
        },
      }),
    ).rejects.toThrow(
      expect.objectContaining({ reason: GameReason.INVALID_SUBSTITUTION }),
    );
  });
});
