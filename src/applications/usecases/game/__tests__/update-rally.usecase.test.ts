import {
  createGame,
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockGameRepository,
  createUser,
} from "@/__tests__/helpers";
import { UpdateRallyUseCase } from "@/applications/usecases/game/update-rally.usecase";
import { NotFoundError } from "@/entities/errors";
import { EntryType, MoveType, Rally, TeamStatsClass } from "@/entities/game";
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

describe("UpdateRallyUseCase", () => {
  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);
    const useCase = new UpdateRallyUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Rally,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when set not found", async () => {
    mockGameRepository.findById.mockResolvedValue({
      ...createGame(),
      sets: [],
    });
    const useCase = new UpdateRallyUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Rally,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns entries from persisted game after updating rally", async () => {
    const game = createGame({
      teams: {
        home: {
          ...createGame().teams.home,
          stats: [new TeamStatsClass()],
        },
        away: {
          ...createGame().teams.away,
          stats: [new TeamStatsClass()],
        },
      },
    });
    const updatedRally: Rally = {
      win: false,
      home: { score: 1, type: MoveType.ATTACK, num: 1 },
      away: { score: 1, type: MoveType.RECEPTION, num: 1 },
    };
    const persistedGame = createGame({
      ...game,
      sets: [
        {
          ...game.sets[0]!,
          entries: [{ type: EntryType.RALLY, ...updatedRally }],
        },
      ],
    });

    mockGameRepository.findById.mockResolvedValue(game);
    mockGameRepository.update.mockResolvedValue(persistedGame);

    const useCase = new UpdateRallyUseCase(
      mockGameRepository,
      mockAuthService,
      mockAuthzService,
    );

    const result = await useCase.execute({
      params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
      data: updatedRally,
    });

    expect(result).toEqual(persistedGame.sets[0]!.entries);
  });
});
