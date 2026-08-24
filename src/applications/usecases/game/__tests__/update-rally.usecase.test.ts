import {
  createGame,
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockGameRepository,
  createUser,
} from "@/__tests__/helpers";
import { UpdateRallyUseCase } from "@/applications/usecases/game/update-rally.usecase";
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

const updatedRally: Rally & EntryIdentity = {
  id: "entry-1",
  seq: 0,
  win: false,
  home: { score: 1, type: MoveType.ATTACK, num: 1 },
  away: { score: 1, type: MoveType.RECEPTION, num: 1 },
};

const useCase = () =>
  new UpdateRallyUseCase(mockGameRepository, mockAuthService, mockAuthzService);

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

    await expect(
      useCase().execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Rally & EntryIdentity,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("upserts the entry and returns the set's entries", async () => {
    const entries = [createRallyEntry(updatedRally)];
    mockGameRepository.findById.mockResolvedValue(createGame());
    mockGameRepository.upsertEntry.mockResolvedValue(entries);

    const result = await useCase().execute({
      params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
      data: updatedRally,
    });

    expect(mockGameRepository.upsertEntry).toHaveBeenCalledWith(
      { gameId: "game-1", setIndex: 0 },
      [{ type: EntryType.RALLY, ...updatedRally }],
    );
    expect(mockGameRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual(entries);
  });

  it("lets the write decide whether the entry exists", async () => {
    mockGameRepository.findById.mockResolvedValue({
      ...createGame(),
      sets: [],
    });
    mockGameRepository.upsertEntry.mockRejectedValue(
      new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found"),
    );

    await expect(
      useCase().execute({
        params: { gameId: "game-1", setIndex: 0, entryIndex: 0 },
        data: updatedRally,
      }),
    ).rejects.toMatchObject({ reason: GameReason.SET_NOT_FOUND });
  });
});
