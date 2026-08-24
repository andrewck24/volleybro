import {
  createGame,
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockGameRepository,
  createUser,
} from "@/__tests__/helpers";
import { CreateRallyUseCase } from "@/applications/usecases/game/create-rally.usecase";
import { GameReason, NotFoundError } from "@/entities/errors";
import {
  EntryType,
  MoveType,
  type EntryIdentity,
  type Rally,
  createRallyEntry,
} from "@/entities/game";
import { beforeEach, describe, expect, it } from "@jest/globals";

let mockGameRepository: ReturnType<typeof createMockGameRepository>;
let mockAuthService: ReturnType<typeof createMockAuthenticationService>;
let mockAuthzService: ReturnType<typeof createMockAuthorizationService>;

const newRally: Rally & EntryIdentity = {
  id: "entry-1",
  seq: 1,
  win: true,
  home: { score: 2, type: MoveType.ATTACK, num: 1 },
  away: { score: 0, type: MoveType.RECEPTION, num: 1 },
};

const useCase = () =>
  new CreateRallyUseCase(mockGameRepository, mockAuthService, mockAuthzService);

beforeEach(() => {
  mockGameRepository = createMockGameRepository();
  mockAuthService = createMockAuthenticationService();
  mockAuthzService = createMockAuthorizationService();
  mockAuthService.verifySession.mockResolvedValue(createUser());
  mockAuthzService.verifyTeamRole.mockResolvedValue(undefined);
});

describe("CreateRallyUseCase", () => {
  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);

    await expect(
      useCase().execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Rally & EntryIdentity,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("appends the rally as an entry and returns the set's entries", async () => {
    const entries = [createRallyEntry(newRally)];
    mockGameRepository.findById.mockResolvedValue(createGame());
    mockGameRepository.appendEntry.mockResolvedValue(entries);

    const result = await useCase().execute({
      params: { gameId: "game-1", setIndex: 0, entryIndex: 1 },
      data: newRally,
    });

    expect(mockGameRepository.appendEntry).toHaveBeenCalledWith(
      { gameId: "game-1", setIndex: 0 },
      { type: EntryType.RALLY, ...newRally },
    );
    expect(mockGameRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual(entries);
  });

  it("lets the write decide whether the set exists", async () => {
    mockGameRepository.findById.mockResolvedValue({
      ...createGame(),
      sets: [],
    });
    mockGameRepository.appendEntry.mockRejectedValue(
      new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found"),
    );

    await expect(
      useCase().execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: newRally,
      }),
    ).rejects.toMatchObject({ reason: GameReason.SET_NOT_FOUND });
  });
});
