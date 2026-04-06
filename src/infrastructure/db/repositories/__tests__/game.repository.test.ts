import { NotFoundError } from "@/entities/errors/app-error";
import { EntryType } from "@/entities/game";
import { Game as GameModel } from "@/infrastructure/db/mongoose/schemas/game";
import { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { Types } from "mongoose";

jest.mock("@/infrastructure/db/mongoose/schemas/game", () => {
  const mockModel = jest
    .fn()
    .mockImplementation((data: Record<string, unknown>) => ({
      ...data,
      save: jest.fn().mockResolvedValue(data),
      toJSON: jest.fn().mockReturnValue(data),
    }));

  Object.assign(mockModel, {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndReplace: jest.fn(),
    findOneAndDelete: jest.fn(),
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
  const nonExistentId = new Types.ObjectId();
  const mockGameData = {
    id: mockGameId,
    teamId: mockTeamId,
    info: {
      name: "Test Game",
      scoring: {
        setCount: 3,
        decidingSetPoints: 15,
      },
    },
  };

  const mockDoc = (data: Record<string, unknown>) => ({
    toJSON: jest.fn().mockReturnValue(data),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new GameRepositoryImpl();
  });

  describe("find", () => {
    it("should return an array of games", async () => {
      (GameModel.find as jest.Mock).mockResolvedValue([mockDoc(mockGameData)]);

      const result = await repository.find({ teamId: mockTeamId });

      expect(result).toEqual([mockGameData]);
    });

    it("should return empty array when no games are found", async () => {
      (GameModel.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.find({ teamId: nonExistentId });

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a single game", async () => {
      (GameModel.findOne as jest.Mock).mockResolvedValue(mockDoc(mockGameData));

      const result = await repository.findOne({ id: mockGameIdString });

      expect(result).toEqual(mockGameData);
    });

    it("should return undefined when game is not found", async () => {
      (GameModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findOne({ id: "nonexistent" });

      expect(result).toBeUndefined();
    });
  });

  describe("create", () => {
    it("should create and return a new game", async () => {
      const createData = {
        ...mockGameData,
        id: mockGameIdString,
        teamId: mockTeamIdString,
      };

      const result = await repository.create(createData);

      expect(result).toMatchObject({
        id: mockGameIdString,
        teamId: mockTeamIdString,
      });
    });
  });

  describe("update", () => {
    const updatedGameData = {
      ...mockGameData,
      id: mockGameIdString,
      teamId: mockTeamIdString,
      info: { name: "Updated Game", scoring: mockGameData.info.scoring },
    };

    it("should update and return the updated game", async () => {
      (GameModel.findOneAndReplace as jest.Mock).mockResolvedValue(
        mockDoc(updatedGameData),
      );

      const result = await repository.update(
        { id: mockGameId },
        updatedGameData,
      );

      expect(result).toEqual(updatedGameData);
    });

    it("should throw NotFoundError when game is not found", async () => {
      (GameModel.findOneAndReplace as jest.Mock).mockResolvedValue(null);

      await expect(
        repository.update({ id: nonExistentId }, updatedGameData),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should return true when deletion is successful", async () => {
      (GameModel.findOneAndDelete as jest.Mock).mockResolvedValue(
        mockDoc(mockGameData),
      );

      const result = await repository.delete({ id: mockGameId });

      expect(result).toBe(true);
    });

    it("should return false when deletion fails", async () => {
      (GameModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await repository.delete({ id: nonExistentId });

      expect(result).toBe(false);
    });
  });

  describe("findMatchesWithPagination", () => {
    const mockMatchResults = [
      {
        id: new Types.ObjectId(),
        win: true,
        info: { name: "Match 1" },
        teams: {
          home: {
            id: new Types.ObjectId(),
            name: "Home Team 1",
            sets: 3,
            scores: [25, 25, 25],
          },
          away: {
            id: new Types.ObjectId(),
            name: "Away Team 1",
            sets: 0,
            scores: [20, 18, 15],
          },
        },
      },
      {
        id: new Types.ObjectId(),
        win: false,
        info: { name: "Match 2" },
        teams: {
          home: {
            id: new Types.ObjectId(),
            name: "Home Team 2",
            sets: 2,
            scores: [25, 25, 20, 16, 8],
          },
          away: {
            id: new Types.ObjectId(),
            name: "Away Team 2",
            sets: 3,
            scores: [23, 23, 25, 25, 15],
          },
        },
      },
    ];

    it("should return paginated match results", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMatchResults);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const filter = { teamId: mockTeamId };
      const options = { limit: 2 };

      const result = await repository.findMatchesWithPagination(
        filter,
        options,
      );

      expect(mockAggregate).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockMatchResults,
        hasMore: false,
        lastId: String(mockMatchResults[1].id),
      });
    });

    it("should handle cursor-based pagination correctly", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMatchResults);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();
      const filter = { teamId: mockTeamId };
      const options = { lastId, limit: 2 };

      await repository.findMatchesWithPagination(filter, options);

      const aggregateCall = mockAggregate.mock.calls[0][0];

      // Verify that filter conditions include the cursor
      const matchStage = aggregateCall.find(
        (stage: Record<string, unknown>) => stage.$match,
      );
      expect(matchStage.$match).toHaveProperty("id");
      expect(matchStage.$match.id.$lt).toBeDefined();
    });

    it("should mark hasMore as true when results exceed limit", async () => {
      const extraResult = {
        id: new Types.ObjectId(),
        win: true,
        info: { name: "Extra Match" },
        teams: {
          home: {
            id: new Types.ObjectId(),
            name: "Home Team Extra",
            sets: 3,
            scores: [25, 25, 25],
          },
          away: {
            id: new Types.ObjectId(),
            name: "Away Team Extra",
            sets: 0,
            scores: [20, 18, 15],
          },
        },
      };

      const mockExec = jest
        .fn()
        .mockResolvedValue([...mockMatchResults, extraResult]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const filter = { teamId: mockTeamId };
      const options = { limit: 2 };

      const result = await repository.findMatchesWithPagination(
        filter,
        options,
      );

      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data).not.toContain(extraResult);
    });

    it("should convert string id to ObjectId", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMatchResults);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const stringId = mockTeamId.toHexString();
      const filter = { teamId: stringId };

      await repository.findMatchesWithPagination(filter);

      const aggregateCall = mockAggregate.mock.calls[0][0];
      const matchStage = aggregateCall.find(
        (stage: Record<string, unknown>) => stage.$match,
      );

      expect(matchStage.$match.teamId.toHexString()).toBe(stringId);
    });

    it("should correctly transform raw Game to MatchResult format", async () => {
      // Mock a complete raw Game object
      const originalGame = {
        id: new Types.ObjectId(),
        win: true,
        teamId: mockTeamId,
        info: { name: "Test Match" },
        teams: {
          home: {
            id: new Types.ObjectId(),
            name: "Home Team",
            players: [],
            staffs: [],
            stats: [],
          },
          away: {
            id: new Types.ObjectId(),
            name: "Away Team",
            players: [],
            staffs: [],
            stats: [],
          },
        },
        sets: [
          {
            win: true, // Home team wins
            lineups: { home: {}, away: {} },
            options: { serve: "home" },
            entries: [
              {
                type: EntryType.RALLY,
                win: true,
                home: { score: 25 },
                away: { score: 20 },
              },
            ],
          },
          {
            win: false, // Home team loses
            lineups: { home: {}, away: {} },
            options: { serve: "home" },
            entries: [
              {
                type: EntryType.RALLY,
                win: false,
                home: { score: 22 },
                away: { score: 25 },
              },
            ],
          },
          {
            win: true, // Home team wins
            lineups: { home: {}, away: {} },
            options: { serve: "away" },
            entries: [
              {
                type: EntryType.RALLY,
                win: true,
                home: { score: 25 },
                away: { score: 18 },
              },
            ],
          },
        ],
      };

      // Expected MatchResult after aggregation pipeline transformation
      const expectedMatchResult = {
        id: originalGame.id,
        win: true,
        info: { name: "Test Match" },
        teams: {
          home: {
            id: originalGame.teams.home.id,
            name: "Home Team",
            sets: 2, // Won 2 sets
            scores: [25, 22, 25], // Scores per set
          },
          away: {
            id: originalGame.teams.away.id,
            name: "Away Team",
            sets: 1, // Won 1 set
            scores: [20, 25, 18], // Scores per set
          },
        },
      };

      // Mock the aggregation pipeline result
      const mockExec = jest.fn().mockResolvedValue([expectedMatchResult]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      // Call the method under test
      const result = await repository.findMatchesWithPagination({
        teamId: mockTeamId,
      });

      // Verify the format and content of the result
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toEqual(expectedMatchResult);

      // Verify key transformed data is correct
      const match = result.data[0];
      expect(match.teams.home.sets).toBe(2);
      expect(match.teams.away.sets).toBe(1);
      expect(match.teams.home.scores).toEqual([25, 22, 25]);
      expect(match.teams.away.scores).toEqual([20, 25, 18]);
    });

    it("should handle the case with no matches", async () => {
      // Mock empty return result
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const result = await repository.findMatchesWithPagination({
        teamId: mockTeamId,
      });

      // Verify empty result handling
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.lastId).toBe("");
    });

    it("should add cursor conditions to existing $and conditions", async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();
      const existingAndCondition = { $and: [{ status: "active" }] };
      const options = { lastId, sortField: "id" };

      await repository.findMatchesWithPagination(existingAndCondition, options);

      const aggregateCall = mockAggregate.mock.calls[0][0];
      const matchStage = aggregateCall.find(
        (stage: Record<string, unknown>) => stage.$match,
      );

      // Verify that original $and conditions are preserved and new conditions are added to the $and array
      expect(matchStage.$match.$and).toHaveLength(2);
      expect(matchStage.$match.$and[0]).toEqual({ status: "active" });
      expect(matchStage.$match.$and[1]).toHaveProperty("id");
      expect(matchStage.$match.$and[1].id.$lt).toBeDefined();
      expect(matchStage.$match.$and[1].id.$lt.toString()).toEqual(
        new Types.ObjectId(lastId).toString(),
      );
    });

    it("should directly add cursor conditions when filter object has no $and", async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();
      const simpleFilter = { status: "active" };
      const options = { lastId, sortField: "id" };

      await repository.findMatchesWithPagination(simpleFilter, options);

      const aggregateCall = mockAggregate.mock.calls[0][0];
      const matchStage = aggregateCall.find(
        (stage: Record<string, unknown>) => stage.$match,
      );

      // Verify that original conditions are preserved and new conditions are added at the top level of the filter
      expect(matchStage.$match).not.toHaveProperty("$and");
      expect(matchStage.$match.status).toBe("active");
      expect(matchStage.$match.id.$lt).toBeDefined();
      expect(matchStage.$match.id.$lt.toString()).toEqual(
        new Types.ObjectId(lastId).toString(),
      );
    });

    it("should use correct comparison operators based on sortDirection", async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();

      // Test descending order (-1) - should use $lt
      await repository.findMatchesWithPagination(
        { teamId: mockTeamId },
        { lastId, sortDirection: -1 },
      );

      let aggregateCall = mockAggregate.mock.calls[0][0];
      let matchStage = aggregateCall.find(
        (stage: Record<string, unknown>) => stage.$match,
      );
      expect(matchStage.$match.id.$lt).toBeDefined();

      // Clear mocks
      jest.clearAllMocks();
      mockAggregate.mockReturnValue({ exec: mockExec });

      // Test ascending order (1) - should use $gt
      await repository.findMatchesWithPagination(
        { teamId: mockTeamId },
        { lastId, sortDirection: 1 },
      );

      aggregateCall = mockAggregate.mock.calls[0][0];
      matchStage = aggregateCall.find(
        (stage: Record<string, unknown>) => stage.$match,
      );
      expect(matchStage.$match.id.$gt).toBeDefined();
    });
  });
});
