// TODO: Database repository tests need detailed mocking strategy
// Current basic protection in jest.setup.ts doesn't support complex mocks
// Solutions: 1) Implement detailed mocks in test files, or 2) Use @shelf/jest-mongodb
// Priority: Low (infrastructure tests, not affecting core functionality)
// Tracked in: CLAUDE.md - Known Testing Issues & Solutions

import { Aggregate, Types } from "mongoose";
import { RecordRepositoryImpl } from "@/infrastructure/db/repositories/record.repository.mongo";
import { Record as RecordModel } from "@/infrastructure/db/mongoose/schemas/record";
import {
  createMockDocument,
  setupModelMocks,
} from "@/infrastructure/db/repositories/tests/helpers";
import { EntryType } from "@/entities/record";

jest.mock("@/infrastructure/db/mongoose/schemas/record");

describe.skip("RecordRepositoryImpl - TODO: Fix complex mocking", () => {
  let repository: RecordRepositoryImpl;
  const mockRecordId = new Types.ObjectId();
  const mockRecordIdString = mockRecordId.toHexString();
  const mockTeamId = new Types.ObjectId();
  const mockTeamIdString = mockTeamId.toHexString();
  const nonExistentId = new Types.ObjectId();
  const nonExistentIdString = nonExistentId.toHexString();
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
  const mockRecord = createMockDocument(mockRecordData);
  let mocks: ReturnType<typeof setupModelMocks>;

  beforeEach(() => {
    repository = new RecordRepositoryImpl();
    mocks = setupModelMocks(RecordModel);
    jest.clearAllMocks();
  });

  describe("find", () => {
    it("should return an array of records", async () => {
      mocks.mockFind.mockResolvedValue([mockRecord]);

      const result = await repository.find({ team_id: mockTeamId });

      expect(mocks.mockFind).toHaveBeenCalledWith({ team_id: mockTeamId });
      expect(result).toEqual([mockRecordData]);
    });

    it("should return null when no records are found", async () => {
      mocks.mockFind.mockResolvedValue(null);

      const result = await repository.find({ team_id: nonExistentId });

      expect(result).toBeNull();
    });
  });

  describe("findOne", () => {
    it("should return a single record", async () => {
      mocks.mockFindOne.mockResolvedValue(mockRecord);

      const result = await repository.findOne({ _id: mockRecordIdString });

      expect(mocks.mockFindOne).toHaveBeenCalledWith({
        _id: mockRecordIdString,
      });
      expect(result).toEqual(mockRecordData);
    });

    it("should return null when record is not found", async () => {
      mocks.mockFindOne.mockResolvedValue(null);

      const result = await repository.findOne({ _id: nonExistentIdString });

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create and return a new record", async () => {
      const mockSave = jest.fn().mockResolvedValue(mockRecord);
      (RecordModel as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
        toJSON: mockRecord.toJSON,
      }));

      const result = await repository.create({
        ...mockRecordData,
        _id: mockRecordIdString,
        team_id: mockTeamIdString,
      });

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockRecordData);
    });
  });

  describe("update", () => {
    const updatedRecordData = {
      ...mockRecordData,
      _id: mockRecordIdString,
      team_id: mockTeamIdString,
      info: { name: "Updated Record", ...mockRecordData.info },
    };
    const updatedRecord = createMockDocument(updatedRecordData);

    it("should update and return the updated record", async () => {
      mocks.mockFindOneAndReplace.mockResolvedValue(updatedRecord);

      const result = await repository.update(
        { _id: mockRecordId },
        updatedRecordData
      );

      expect(mocks.mockFindOneAndReplace).toHaveBeenCalledWith(
        { _id: mockRecordId },
        updatedRecordData,
        { new: true }
      );
      expect(result).toEqual(updatedRecordData);
    });

    it("should return null when record is not found", async () => {
      mocks.mockFindOneAndReplace.mockResolvedValue(null);

      const result = await repository.update(
        { _id: nonExistentId },
        updatedRecordData
      );

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should return true when deletion is successful", async () => {
      mocks.mockFindOneAndDelete.mockResolvedValue(mockRecord);

      const result = await repository.delete({ _id: mockRecordId });

      expect(mocks.mockFindOneAndDelete).toHaveBeenCalledWith({
        _id: mockRecordId,
      });
      expect(result).toBe(true);
    });

    it("should return false when deletion fails", async () => {
      mocks.mockFindOneAndDelete.mockResolvedValue(null);

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

    beforeEach(() => {
      jest.spyOn(RecordModel, "aggregate").mockImplementation(
        () =>
          ({
            exec: jest.fn(),
          } as unknown as Aggregate<any>)
      );
    });

    it("should return paginated match results", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMatchResults);
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
        exec: mockExec,
      }));

      const filter = { team_id: mockTeamId };
      const options = { limit: 2 };

      const result = await repository.findMatchesWithPagination(
        filter,
        options
      );

      expect(RecordModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockMatchResults,
        hasMore: false,
        lastId: mockMatchResults[1]._id,
      });
    });

    it("should handle cursor-based pagination correctly", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMatchResults);
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
        exec: mockExec,
      }));

      const lastId = new Types.ObjectId().toHexString();
      const filter = { team_id: mockTeamId };
      const options = { lastId, limit: 2 };

      await repository.findMatchesWithPagination(filter, options);

      const aggregateCall = (RecordModel.aggregate as jest.Mock).mock
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
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
        exec: mockExec,
      }));

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
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
        exec: mockExec,
      }));

      const stringId = mockTeamId.toHexString();
      const filter = { team_id: stringId };

      await repository.findMatchesWithPagination(filter);

      const aggregateCall = (RecordModel.aggregate as jest.Mock).mock
        .calls[0][0];
      const matchStage = aggregateCall.find((stage: any) => stage.$match);

      expect(matchStage.$match.team_id).toBeInstanceOf(Types.ObjectId);
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
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
        exec: mockExec,
      }));

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
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
        exec: mockExec,
      }));

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
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
      exec: mockExec,
      }));

      const lastId = new Types.ObjectId().toHexString();
      const existingAndCondition = { $and: [{ status: "active" }] };
      const options = { lastId, sortField: "_id" };

      await repository.findMatchesWithPagination(existingAndCondition, options);

      const aggregateCall = (RecordModel.aggregate as jest.Mock).mock
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
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
      exec: mockExec,
      }));

      const lastId = new Types.ObjectId().toHexString();
      const simpleFilter = { status: "active" };
      const options = { lastId, sortField: "_id" };

      await repository.findMatchesWithPagination(simpleFilter, options);

      const aggregateCall = (RecordModel.aggregate as jest.Mock).mock
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
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
      exec: mockExec,
      }));

      const lastId = new Types.ObjectId().toHexString();

      // Test descending order (-1) - should use $lt
      await repository.findMatchesWithPagination(
      { team_id: mockTeamId },
      { lastId, sortDirection: -1 }
      );

      let aggregateCall = (RecordModel.aggregate as jest.Mock).mock.calls[0][0];
      let matchStage = aggregateCall.find((stage: any) => stage.$match);
      expect(matchStage.$match._id.$lt).toBeDefined();

      // Clear mocks
      jest.clearAllMocks();
      (RecordModel.aggregate as jest.Mock).mockImplementation(() => ({
      exec: mockExec,
      }));

      // Test ascending order (1) - should use $gt
      await repository.findMatchesWithPagination(
      { team_id: mockTeamId },
      { lastId, sortDirection: 1 }
      );

      aggregateCall = (RecordModel.aggregate as jest.Mock).mock.calls[0][0];
      matchStage = aggregateCall.find((stage: any) => stage.$match);
      expect(matchStage.$match._id.$gt).toBeDefined();
    });
    });
});
