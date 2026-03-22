import { Types } from "mongoose";
import { RecordRepositoryImpl } from "@/infrastructure/db/repositories/record.repository.mongo";
import { Record as RecordModel } from "@/infrastructure/db/mongoose/schemas/record";
import { EntryType } from "@/entities/record";

jest.mock("@/infrastructure/db/mongoose/schemas/record", () => {
  const mockModel = jest.fn().mockImplementation((data: unknown) => ({
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

  return { Record: mockModel };
});

const mockAggregate = RecordModel.aggregate as jest.Mock;

describe("RecordRepositoryImpl", () => {
  let repository: RecordRepositoryImpl;
  const mockRecordId = new Types.ObjectId();
  const mockRecordIdString = mockRecordId.toHexString();
  const mockTeamId = new Types.ObjectId();
  const mockTeamIdString = mockTeamId.toHexString();
  const nonExistentId = new Types.ObjectId();
  const mockRecordData = {
    _id: mockRecordId,
    team_id: mockTeamId,
    info: {
      name: "Test Record",
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
    repository = new RecordRepositoryImpl();
  });

  describe("find", () => {
    it("should return an array of records", async () => {
      (RecordModel.find as jest.Mock).mockResolvedValue([
        mockDoc(mockRecordData),
      ]);

      const result = await repository.find({ team_id: mockTeamId });

      expect(result).toEqual([mockRecordData]);
    });

    it("should return null when no records are found", async () => {
      (RecordModel.find as jest.Mock).mockResolvedValue(null);

      const result = await repository.find({ team_id: nonExistentId });

      expect(result).toBeNull();
    });
  });

  describe("findOne", () => {
    it("should return a single record", async () => {
      (RecordModel.findOne as jest.Mock).mockResolvedValue(
        mockDoc(mockRecordData),
      );

      const result = await repository.findOne({ _id: mockRecordIdString });

      expect(result).toEqual(mockRecordData);
    });

    it("should return null when record is not found", async () => {
      (RecordModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findOne({ _id: "nonexistent" });

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create and return a new record", async () => {
      const createData = {
        ...mockRecordData,
        _id: mockRecordIdString,
        team_id: mockTeamIdString,
      };

      const result = await repository.create(createData);

      expect(result).toMatchObject({
        _id: mockRecordIdString,
        team_id: mockTeamIdString,
      });
    });
  });

  describe("update", () => {
    const updatedRecordData = {
      ...mockRecordData,
      _id: mockRecordIdString,
      team_id: mockTeamIdString,
      info: { name: "Updated Record", ...mockRecordData.info },
    };

    it("should update and return the updated record", async () => {
      (RecordModel.findOneAndReplace as jest.Mock).mockResolvedValue(
        mockDoc(updatedRecordData),
      );

      const result = await repository.update(
        { _id: mockRecordId },
        updatedRecordData,
      );

      expect(result).toEqual(updatedRecordData);
    });

    it("should return null when record is not found", async () => {
      (RecordModel.findOneAndReplace as jest.Mock).mockResolvedValue(null);

      const result = await repository.update(
        { _id: nonExistentId },
        updatedRecordData,
      );

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should return true when deletion is successful", async () => {
      (RecordModel.findOneAndDelete as jest.Mock).mockResolvedValue(
        mockDoc(mockRecordData),
      );

      const result = await repository.delete({ _id: mockRecordId });

      expect(result).toBe(true);
    });

    it("should return false when deletion fails", async () => {
      (RecordModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await repository.delete({ _id: nonExistentId });

      expect(result).toBe(false);
    });
  });

  describe("findMatchesWithPagination", () => {
    const mockMatchResults = [
      {
        _id: new Types.ObjectId(),
        win: true,
        info: { name: "Match 1" },
        teams: {
          home: {
            _id: new Types.ObjectId(),
            name: "Home Team 1",
            sets: 3,
            scores: [25, 25, 25],
          },
          away: {
            _id: new Types.ObjectId(),
            name: "Away Team 1",
            sets: 0,
            scores: [20, 18, 15],
          },
        },
      },
      {
        _id: new Types.ObjectId(),
        win: false,
        info: { name: "Match 2" },
        teams: {
          home: {
            _id: new Types.ObjectId(),
            name: "Home Team 2",
            sets: 2,
            scores: [25, 25, 20, 16, 8],
          },
          away: {
            _id: new Types.ObjectId(),
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

      const filter = { team_id: mockTeamId };
      const options = { limit: 2 };

      const result = await repository.findMatchesWithPagination(
        filter,
        options
      );

      expect(mockAggregate).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockMatchResults,
        hasMore: false,
        lastId: mockMatchResults[1]._id,
      });
    });

    it("should handle cursor-based pagination correctly", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMatchResults);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();
      const filter = { team_id: mockTeamId };
      const options = { lastId, limit: 2 };

      await repository.findMatchesWithPagination(filter, options);

      const aggregateCall = mockAggregate.mock
        .calls[0][0];

      // Verify that filter conditions include the cursor
      const matchStage = aggregateCall.find((stage: any) => stage.$match);
      expect(matchStage.$match).toHaveProperty("_id");
      expect(matchStage.$match._id.$lt).toBeDefined();
    });

    it("should mark hasMore as true when results exceed limit", async () => {
      const extraResult = {
        _id: new Types.ObjectId(),
        win: true,
        info: { name: "Extra Match" },
        teams: {
          home: {
            _id: new Types.ObjectId(),
            name: "Home Team Extra",
            sets: 3,
            scores: [25, 25, 25],
          },
          away: {
            _id: new Types.ObjectId(),
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

      const filter = { team_id: mockTeamId };
      const options = { limit: 2 };

      const result = await repository.findMatchesWithPagination(
        filter,
        options
      );

      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data).not.toContain(extraResult);
    });

    it("should convert string _id to ObjectId", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMatchResults);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const stringId = mockTeamId.toHexString();
      const filter = { team_id: stringId };

      await repository.findMatchesWithPagination(filter);

      const aggregateCall = mockAggregate.mock
        .calls[0][0];
      const matchStage = aggregateCall.find((stage: any) => stage.$match);

      expect(matchStage.$match.team_id.toHexString()).toBe(stringId);
    });

    it("should correctly transform raw Record to MatchResult format", async () => {
      // Mock a complete raw Record object
      const originalRecord = {
        _id: new Types.ObjectId(),
        win: true,
        team_id: mockTeamId,
        info: { name: "Test Match" },
        teams: {
          home: {
            _id: new Types.ObjectId(),
            name: "Home Team",
            players: [],
            staffs: [],
            stats: [],
          },
          away: {
            _id: new Types.ObjectId(),
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
                type: EntryType.RALLY, // Rally type
                data: { win: true, home: { score: 25 }, away: { score: 20 } },
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
                data: { win: false, home: { score: 22 }, away: { score: 25 } },
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
                data: { win: true, home: { score: 25 }, away: { score: 18 } },
              },
            ],
          },
        ],
      };

      // Expected MatchResult after aggregation pipeline transformation
      const expectedMatchResult = {
        _id: originalRecord._id,
        win: true,
        info: { name: "Test Match" },
        teams: {
          home: {
            _id: originalRecord.teams.home._id,
            name: "Home Team",
            sets: 2, // Won 2 sets
            scores: [25, 22, 25], // Scores per set
          },
          away: {
            _id: originalRecord.teams.away._id,
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
        team_id: mockTeamId,
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

    it("should handle the case with no match records", async () => {
      // Mock empty return result
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const result = await repository.findMatchesWithPagination({
        team_id: mockTeamId,
      });

      // Verify empty result handling
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.lastId).toBeUndefined();
    });

    it("should add cursor conditions to existing $and conditions", async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();
      const existingAndCondition = { $and: [{ status: "active" }] };
      const options = { lastId, sortField: "_id" };

      await repository.findMatchesWithPagination(existingAndCondition, options);

      const aggregateCall = mockAggregate.mock
      .calls[0][0];
      const matchStage = aggregateCall.find((stage: any) => stage.$match);

      // Verify that original $and conditions are preserved and new conditions are added to the $and array
      expect(matchStage.$match.$and).toHaveLength(2);
      expect(matchStage.$match.$and[0]).toEqual({ status: "active" });
      expect(matchStage.$match.$and[1]).toHaveProperty("_id");
      expect(matchStage.$match.$and[1]._id.$lt).toBeDefined();
      expect(matchStage.$match.$and[1]._id.$lt.toString()).toEqual(
      new Types.ObjectId(lastId).toString()
      );
    });

    it("should directly add cursor conditions when filter object has no $and", async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();
      const simpleFilter = { status: "active" };
      const options = { lastId, sortField: "_id" };

      await repository.findMatchesWithPagination(simpleFilter, options);

      const aggregateCall = mockAggregate.mock
      .calls[0][0];
      const matchStage = aggregateCall.find((stage: any) => stage.$match);

      // Verify that original conditions are preserved and new conditions are added at the top level of the filter
      expect(matchStage.$match).not.toHaveProperty("$and");
      expect(matchStage.$match.status).toBe("active");
      expect(matchStage.$match._id.$lt).toBeDefined();
      expect(matchStage.$match._id.$lt.toString()).toEqual(
      new Types.ObjectId(lastId).toString()
      );
    });

    it("should use correct comparison operators based on sortDirection", async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      mockAggregate.mockReturnValue({ exec: mockExec });

      const lastId = new Types.ObjectId().toHexString();

      // Test descending order (-1) - should use $lt
      await repository.findMatchesWithPagination(
      { team_id: mockTeamId },
      { lastId, sortDirection: -1 }
      );

      let aggregateCall = mockAggregate.mock.calls[0][0];
      let matchStage = aggregateCall.find((stage: any) => stage.$match);
      expect(matchStage.$match._id.$lt).toBeDefined();

      // Clear mocks
      jest.clearAllMocks();
      mockAggregate.mockReturnValue({ exec: mockExec });

      // Test ascending order (1) - should use $gt
      await repository.findMatchesWithPagination(
      { team_id: mockTeamId },
      { lastId, sortDirection: 1 }
      );

      aggregateCall = mockAggregate.mock.calls[0][0];
      matchStage = aggregateCall.find((stage: any) => stage.$match);
      expect(matchStage.$match._id.$gt).toBeDefined();
    });
    });
});
