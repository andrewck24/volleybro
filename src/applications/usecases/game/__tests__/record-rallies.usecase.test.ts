import {
  createGame,
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockGameRepository,
  createUser,
} from "@/__tests__/helpers";
import { RecordRalliesUseCase } from "@/applications/usecases/game/record-rallies.usecase";
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
  new RecordRalliesUseCase(
    mockGameRepository,
    mockAuthService,
    mockAuthzService,
  );

beforeEach(() => {
  mockGameRepository = createMockGameRepository();
  mockAuthService = createMockAuthenticationService();
  mockAuthzService = createMockAuthorizationService();
  mockAuthService.verifySession.mockResolvedValue(createUser());
  mockAuthzService.verifyTeamRole.mockResolvedValue(undefined);
});

describe("RecordRalliesUseCase", () => {
  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);

    await expect(
      useCase().execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: [{} as unknown as Rally & EntryIdentity],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("upserts one or more rallies as entries and returns them without a set completion", async () => {
    const entries = [createRallyEntry(newRally)];
    // A mid-set score with the set already undecided: deriveSetCompletion
    // sees no phase change to report.
    const game = createGame();
    game.sets[0]!.win = null;
    mockGameRepository.findById.mockResolvedValue(game);
    mockGameRepository.upsertEntry.mockResolvedValue(entries);

    const result = await useCase().execute({
      params: { gameId: "game-1", setIndex: 0 },
      data: [newRally],
    });

    expect(mockGameRepository.upsertEntry).toHaveBeenCalledWith(
      { gameId: "game-1", setIndex: 0 },
      [{ type: EntryType.RALLY, ...newRally }],
    );
    expect(mockGameRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual({ entries });
    expect(result.setCompletionConfirmed).toBeUndefined();
  });

  it("lets the write decide whether the set exists", async () => {
    mockGameRepository.findById.mockResolvedValue({
      ...createGame(),
      sets: [],
    });
    mockGameRepository.upsertEntry.mockRejectedValue(
      new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found"),
    );

    await expect(
      useCase().execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: [newRally],
      }),
    ).rejects.toMatchObject({ reason: GameReason.SET_NOT_FOUND });
  });

  it("reports the set result as confirmed once completeSet succeeds", async () => {
    const decidingRally: Rally & EntryIdentity = {
      id: "entry-25",
      seq: 24,
      win: true,
      home: { score: 25, type: MoveType.ATTACK, num: 1 },
      away: { score: 20, type: MoveType.RECEPTION, num: 1 },
    };
    const entries = [createRallyEntry(decidingRally)];
    const game = createGame();
    game.sets[0]!.win = null;
    mockGameRepository.findById.mockResolvedValue(game);
    mockGameRepository.upsertEntry.mockResolvedValue(entries);
    mockGameRepository.completeSet.mockResolvedValue(undefined);

    const result = await useCase().execute({
      params: { gameId: "game-1", setIndex: 0 },
      data: [decidingRally],
    });

    expect(mockGameRepository.completeSet).toHaveBeenCalled();
    expect(result).toEqual({ entries, setCompletionConfirmed: true });
  });

  it("still returns the persisted entries when completeSet fails, marked unconfirmed", async () => {
    const decidingRally: Rally & EntryIdentity = {
      id: "entry-25",
      seq: 24,
      win: true,
      home: { score: 25, type: MoveType.ATTACK, num: 1 },
      away: { score: 20, type: MoveType.RECEPTION, num: 1 },
    };
    const entries = [createRallyEntry(decidingRally)];
    const game = createGame();
    game.sets[0]!.win = null;
    mockGameRepository.findById.mockResolvedValue(game);
    mockGameRepository.upsertEntry.mockResolvedValue(entries);
    mockGameRepository.completeSet.mockRejectedValue(new Error("db down"));

    const result = await useCase().execute({
      params: { gameId: "game-1", setIndex: 0 },
      data: [decidingRally],
    });

    expect(result).toEqual({ entries, setCompletionConfirmed: false });
  });
});
