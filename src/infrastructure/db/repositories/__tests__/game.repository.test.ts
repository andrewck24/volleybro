import { mockDoc, mockExec } from "@/__tests__/helpers";
import { NotFoundError } from "@/entities/errors/app-error";
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
      expect(result.lastId).toBe(mockGameSummaries[1].id);
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
      expect(result.data[0].teams.home.sets).toBe(2);
      expect(result.data[0].teams.away.sets).toBe(1);
    });
  });
});
