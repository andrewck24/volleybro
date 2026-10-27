import {
  createGame,
  createPlayer,
  createUser,
} from "@test/support/fixtures/entities";
import { createRecordedRally } from "@test/support/fixtures/entries";
import {
  createMockAuthenticationService,
  createMockAuthorizationService,
} from "@test/support/doubles/services";
import { createMockGameRepository } from "@test/support/doubles/repositories";
import { RecordEntriesUseCase } from "@/applications/usecases/game/record-entries.usecase";
import { GameReason, NotFoundError } from "@/entities/errors";
import {
  EntryType,
  MoveType,
  Side,
  type RallyEntry,
  type SubstitutionEntry,
} from "@/entities/game";
import { beforeEach, describe, expect, it } from "@jest/globals";

let mockGameRepository: ReturnType<typeof createMockGameRepository>;
let mockAuthService: ReturnType<typeof createMockAuthenticationService>;
let mockAuthzService: ReturnType<typeof createMockAuthorizationService>;

const at = new Date("2026-03-01T10:00:00.000Z");

const newRally: RallyEntry & { at: Date } = {
  type: EntryType.RALLY,
  id: "entry-1",
  at,
  seq: 1,
  win: true,
  home: { score: 2, type: MoveType.ATTACK, num: 1 },
  away: { score: 0, type: MoveType.RECEPTION, num: 1 },
};

const contentOf = <T extends { at: Date }>({ at: _at, ...content }: T) =>
  content;

const useCase = () =>
  new RecordEntriesUseCase(
    mockGameRepository,
    mockAuthService,
    mockAuthzService,
  );

beforeEach(() => {
  mockGameRepository = createMockGameRepository();
  mockAuthService = createMockAuthenticationService();
  mockAuthzService = createMockAuthorizationService();
  mockAuthService.verifySession.mockResolvedValue(createUser());
});

describe("RecordEntriesUseCase", () => {
  it("throws NotFoundError when game not found", async () => {
    mockGameRepository.findById.mockResolvedValue(null);

    await expect(
      useCase().execute({
        params: { gameId: "game-1", setIndex: 0 },
        data: [{} as unknown as RallyEntry & { at: Date }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("upserts one or more rallies as entries and returns them without a set completion", async () => {
    const operator = createPlayer({ id: "player-9" });
    mockAuthzService.verifyTeamRole.mockResolvedValue(operator);
    const entries = [createRecordedRally(newRally)];
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
      [{ entry: contentOf(newRally), at }],
      "player-9",
    );
    expect(mockGameRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual({ entries });
    expect(result.setCompletionConfirmed).toBeUndefined();
  });

  it("writes a rally and a substitution of one request together, in the order sent", async () => {
    const operator = createPlayer({ id: "player-9" });
    mockAuthzService.verifyTeamRole.mockResolvedValue(operator);
    const game = createGame();
    game.sets[0]!.win = null;
    mockGameRepository.findById.mockResolvedValue(game);
    mockGameRepository.upsertEntry.mockResolvedValue([]);
    const substitution: SubstitutionEntry & { at: Date } = {
      type: EntryType.SUBSTITUTION,
      id: "entry-sub",
      seq: 2,
      at,
      team: Side.HOME,
      players: { in: "player-7", out: "player-1" },
    };

    await useCase().execute({
      params: { gameId: "game-1", setIndex: 0 },
      data: [newRally, substitution],
    });

    expect(mockGameRepository.upsertEntry).toHaveBeenCalledWith(
      { gameId: "game-1", setIndex: 0 },
      [
        { entry: contentOf(newRally), at },
        { entry: contentOf(substitution), at },
      ],
      "player-9",
    );
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
    const decidingRally: RallyEntry & { at: Date } = {
      type: EntryType.RALLY,
      id: "entry-25",
      at,
      seq: 24,
      win: true,
      home: { score: 25, type: MoveType.ATTACK, num: 1 },
      away: { score: 20, type: MoveType.RECEPTION, num: 1 },
    };
    const entries = [createRecordedRally(decidingRally)];
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
    const decidingRally: RallyEntry & { at: Date } = {
      type: EntryType.RALLY,
      id: "entry-25",
      at,
      seq: 24,
      win: true,
      home: { score: 25, type: MoveType.ATTACK, num: 1 },
      away: { score: 20, type: MoveType.RECEPTION, num: 1 },
    };
    const entries = [createRecordedRally(decidingRally)];
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
