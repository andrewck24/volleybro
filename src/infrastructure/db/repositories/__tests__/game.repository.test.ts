import { mockDoc, mockExec } from "@/__tests__/helpers";
import { NotFoundError } from "@/entities/errors";
import { EntryType, MoveType, Side, type Game } from "@/entities/game";
import { Game as GameModel } from "@/infrastructure/db/mongoose/schemas/game";
import { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { Types } from "mongoose";

jest.mock("@/infrastructure/db/mongoose/schemas/game", () => {
  const mockModel = jest.fn();
  Object.assign(mockModel, {
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    aggregate: jest.fn(),
  });
  return { Game: mockModel };
});
const mockAggregate = GameModel.aggregate as jest.Mock;

describe("GameRepositoryImpl", () => {
  let repository: GameRepositoryImpl;
  const mockGameId = new Types.ObjectId();
  const mockGameIdString = mockGameId.toHexString();
  const mockTeamId = new Types.ObjectId();
  const mockTeamIdString = mockTeamId.toHexString();
  const nonExistentIdString = new Types.ObjectId().toHexString();

  const mockGameData = {
    _id: mockGameId,
    teamId: mockTeamIdString,
    win: false,
    info: {
      name: "Test Game",
      scoring: { setCount: 3, decidingSetPoints: 15 },
    },
    teams: {
      home: {
        id: mockTeamIdString,
        name: "Home",
        players: [],
        staffs: [],
        stats: [],
      },
      away: {
        id: mockTeamIdString,
        name: "Away",
        players: [],
        staffs: [],
        stats: [],
      },
    },
    sets: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new GameRepositoryImpl();
  });

  describe("findById", () => {
    it("should return a game when found", async () => {
      (GameModel.findById as jest.Mock).mockReturnValue(
        mockExec(mockDoc(mockGameData)),
      );

      const result = await repository.findById(mockGameIdString);

      expect(result).toMatchObject({
        id: mockGameIdString,
        teamId: mockTeamIdString,
      });
    });

    it("should return null when game not found", async () => {
      (GameModel.findById as jest.Mock).mockReturnValue(mockExec(null));

      const result = await repository.findById(nonExistentIdString);

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create and return a new game", async () => {
      (GameModel.create as jest.Mock).mockResolvedValue(mockDoc(mockGameData));

      const result = await repository.create({
        win: false,
        teamId: mockTeamIdString,
        info: mockGameData.info,
        teams: mockGameData.teams,
        sets: [],
      });

      expect(result).toMatchObject({
        id: mockGameIdString,
        teamId: mockTeamIdString,
      });
    });
  });

  describe("update", () => {
    const updatedGameData = {
      ...mockGameData,
      info: { name: "Updated Game", scoring: mockGameData.info.scoring },
    };

    it("should update and return the updated game", async () => {
      (GameModel.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockExec(mockDoc(updatedGameData)),
      );

      const result = await repository.update(mockGameIdString, {
        info: updatedGameData.info,
      });

      expect(result).toMatchObject({ info: { name: "Updated Game" } });
    });

    it("should throw NotFoundError when game is not found", async () => {
      (GameModel.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockExec(null),
      );

      await expect(
        repository.update(nonExistentIdString, { win: true }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should return true when deletion is successful", async () => {
      (GameModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        mockExec(mockDoc(mockGameData)),
      );

      const result = await repository.delete(mockGameIdString);

      expect(result).toBe(true);
    });

    it("should return false when game not found", async () => {
      (GameModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        mockExec(null),
      );

      const result = await repository.delete(nonExistentIdString);

      expect(result).toBe(false);
    });
  });

  describe("player reference mapping", () => {
    const playerHexId = "64b000000000000000000001";
    const inHexId = "64b000000000000000000002";
    const outHexId = "64b000000000000000000003";

    it("toGame exposes nested player ids on lineups, snapshots, rally detail and substitution", async () => {
      const storedGame = {
        _id: mockGameId,
        teamId: mockTeamId,
        win: false,
        info: mockGameData.info,
        teams: {
          home: {
            id: mockTeamIdString,
            name: "Home",
            players: [
              {
                playerId: new Types.ObjectId(playerHexId),
                name: "P1",
                number: 1,
                stats: [],
              },
            ],
            staffs: [],
            stats: [],
          },
          away: {
            id: mockTeamIdString,
            name: "Away",
            players: [],
            staffs: [],
            stats: [],
          },
        },
        sets: [
          {
            win: null,
            lineups: {
              home: {
                options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
                starting: [
                  { playerId: new Types.ObjectId(playerHexId), position: "OH" },
                  { playerId: null },
                ],
                liberos: [],
                substitutes: [],
              },
            },
            options: { serve: "home" },
            entries: [
              {
                type: EntryType.RALLY,
                win: true,
                home: {
                  score: 1,
                  type: MoveType.ATTACK,
                  num: 1,
                  player: {
                    playerId: new Types.ObjectId(playerHexId),
                    zone: 4,
                  },
                },
                away: { score: 0, type: MoveType.ATTACK, num: 1 },
              },
              {
                type: EntryType.SUBSTITUTION,
                team: Side.HOME,
                players: {
                  in: new Types.ObjectId(inHexId),
                  out: new Types.ObjectId(outHexId),
                },
              },
            ],
          },
        ],
      };
      (GameModel.findById as jest.Mock).mockReturnValue(
        mockExec(mockDoc(storedGame)),
      );

      const result = await repository.findById(mockGameIdString);

      const home = result!.teams.home;
      expect(home.players[0]!.id).toBe(playerHexId);
      expect(
        (home.players[0] as unknown as { playerId?: unknown }).playerId,
      ).toBeUndefined();

      const starting = result!.sets[0]!.lineups.home.starting;
      expect(starting[0]!.id).toBe(playerHexId);
      expect(starting[1]!.id).toBeNull();

      const entries = result!.sets[0]!.entries;
      expect(
        (entries[0] as { home: { player: { id: string } } }).home.player.id,
      ).toBe(playerHexId);
      expect(
        (entries[1] as { players: { in: string; out: string } }).players.in,
      ).toBe(inHexId);
      expect(
        (entries[1] as { players: { in: string; out: string } }).players.out,
      ).toBe(outHexId);
    });

    it("toGameDoc persists client ids as playerId on create", async () => {
      const domainGame = {
        win: false,
        teamId: mockTeamIdString,
        info: mockGameData.info,
        teams: {
          home: {
            id: mockTeamIdString,
            name: "Home",
            players: [{ id: playerHexId, name: "P1", number: 1, stats: [] }],
            staffs: [],
            stats: [],
          },
          away: {
            id: mockTeamIdString,
            name: "Away",
            players: [],
            staffs: [],
            stats: [],
          },
        },
        sets: [
          {
            win: null,
            lineups: {
              home: {
                options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
                starting: [{ id: playerHexId, position: "OH" }, { id: null }],
                liberos: [],
                substitutes: [],
              },
            },
            options: { serve: "home" },
            entries: [
              {
                type: EntryType.RALLY,
                win: true,
                home: {
                  score: 1,
                  type: MoveType.ATTACK,
                  num: 1,
                  player: { id: playerHexId, zone: 4 },
                },
                away: { score: 0, type: MoveType.ATTACK, num: 1 },
              },
            ],
          },
        ],
      } as unknown as Omit<Game, "id">;
      (GameModel.create as jest.Mock).mockResolvedValue(
        mockDoc({
          _id: mockGameId,
          teamId: mockTeamId,
          teams: {
            home: { players: [], staffs: [], stats: [] },
            away: { players: [], staffs: [], stats: [] },
          },
          sets: [],
        }),
      );

      await repository.create(domainGame);

      const arg = (GameModel.create as jest.Mock).mock.calls[0][0];
      expect(arg.id).toBeUndefined();
      expect(arg.teams.home.players[0].playerId).toBe(playerHexId);
      expect(arg.teams.home.players[0].id).toBeUndefined();
      expect(arg.sets[0].lineups.home.starting[0].playerId).toBe(playerHexId);
      expect(arg.sets[0].lineups.home.starting[1].playerId).toBeNull();
      expect(arg.sets[0].entries[0].home.player.playerId).toBe(playerHexId);
      expect(arg.sets[0].entries[0].home.player.id).toBeUndefined();
    });
  });

  describe("findGameSummaries", () => {
    const mockGameSummaries = [
      {
        id: new Types.ObjectId().toHexString(),
        win: true,
        info: { name: "Game 1" },
        teams: {
          home: {
            id: mockTeamIdString,
            name: "Home Team 1",
            sets: 3,
            scores: [25, 25, 25],
          },
          away: {
            id: mockTeamIdString,
            name: "Away Team 1",
            sets: 0,
            scores: [20, 18, 15],
          },
        },
      },
      {
        id: new Types.ObjectId().toHexString(),
        win: false,
        info: { name: "Game 2" },
        teams: {
          home: {
            id: mockTeamIdString,
            name: "Home Team 2",
            sets: 2,
            scores: [25, 25, 20, 16],
          },
          away: {
            id: mockTeamIdString,
            name: "Away Team 2",
            sets: 3,
            scores: [23, 23, 25, 25],
          },
        },
      },
    ];

    it("should return paginated results", async () => {
      mockAggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGameSummaries),
      });

      const result = await repository.findGameSummaries(mockTeamIdString, {
        limit: 2,
      });

      expect(mockAggregate).toHaveBeenCalled();
      expect(result.data).toEqual(mockGameSummaries);
      expect(result.hasMore).toBe(false);
      expect(result.lastId).toBe(mockGameSummaries[1]!.id);
    });

    it("should mark hasMore true when results exceed limit", async () => {
      const extraResult = {
        ...mockGameSummaries[0],
        id: new Types.ObjectId().toHexString(),
      };
      mockAggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([...mockGameSummaries, extraResult]),
      });

      const result = await repository.findGameSummaries(mockTeamIdString, {
        limit: 2,
      });

      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(2);
    });

    it("should add cursor filter when lastId provided", async () => {
      mockAggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const lastId = "aabbccddeeff00112233aabb";
      await repository.findGameSummaries(mockTeamIdString, { lastId });

      const aggregateCall = mockAggregate.mock.calls[0][0];
      const matchStage = aggregateCall.find(
        (stage: Record<string, unknown>) => stage.$match,
      );
      expect(matchStage.$match._id).toBeDefined();
      expect(matchStage.$match._id.$lt).toBeDefined();
    });

    it("should return empty result with original lastId when no games", async () => {
      mockAggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const lastId = mockGameIdString;
      const result = await repository.findGameSummaries(mockTeamIdString, {
        lastId,
      });

      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.lastId).toBe(lastId);
    });

    it("should correctly aggregate game data to GameSummary format", async () => {
      const expectedSummary = {
        id: mockGameIdString,
        win: true,
        info: { name: "Test Game" },
        teams: {
          home: {
            id: mockTeamIdString,
            name: "Home Team",
            sets: 2,
            scores: [25, 22, 25],
          },
          away: {
            id: mockTeamIdString,
            name: "Away Team",
            sets: 1,
            scores: [20, 25, 18],
          },
        },
      };
      mockAggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([expectedSummary]),
      });

      const result = await repository.findGameSummaries(mockTeamIdString);

      expect(result.data.length).toBe(1);
      expect(result.data[0]!.teams.home.sets).toBe(2);
      expect(result.data[0]!.teams.away.sets).toBe(1);
    });
  });
});
