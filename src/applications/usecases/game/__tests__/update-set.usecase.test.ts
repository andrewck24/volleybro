import { createGame, createUser } from "@test/support/fixtures/entities";
import {
  createMockAuthenticationService,
  createMockAuthorizationService,
} from "@test/support/doubles/services";
import { createMockGameRepository } from "@test/support/doubles/repositories";
import { UpdateSetUseCase } from "@/applications/usecases/game/update-set.usecase";
import { GameReason, NotFoundError } from "@/entities/errors";
import { Set } from "@/entities/game";
import { Position, type Lineup } from "@/entities/team";
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

describe("UpdateSetUseCase", () => {
  it("rejects a starting lineup that includes a player outside the team roster", async () => {
    const game = createGame();
    mockGameRepository.findById.mockResolvedValue(game);
    const useCase = new UpdateSetUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    const invalidLineup: Lineup = {
      options: {
        liberoReplaceMode: 0,
        liberoReplacePosition: Position.NONE,
      },
      starting: [{ id: "outside-player", position: Position.OH }],
      liberos: [],
      substitutes: [],
    };
    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: { options: { serve: "away" }, lineup: invalidLineup },
      }),
    ).rejects.toMatchObject({ reason: GameReason.STALE_LINEUP });
    expect(mockGameRepository.updateSet).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);
    const useCase = new UpdateSetUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: { options: {} as unknown as Set["options"] },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when set not found", async () => {
    mockGameRepository.findById.mockResolvedValue({
      ...createGame(),
      sets: [],
    });
    const useCase = new UpdateSetUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: { options: {} as unknown as Set["options"] },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
