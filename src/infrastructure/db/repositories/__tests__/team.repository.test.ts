import { mockDoc, mockExec } from "@/__tests__/helpers";
import { NotFoundError } from "@/entities/errors";
import { Position, type Lineup } from "@/entities/team";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { TeamRepositoryImpl } from "@/infrastructure/db/repositories/team.repository.mongo";
import { Types } from "mongoose";

jest.mock("@/infrastructure/db/mongoose/schemas/team", () => {
  const mockModel = jest.fn();
  Object.assign(mockModel, {
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateOne: jest.fn(),
  });
  return { Team: mockModel };
});

describe("TeamRepositoryImpl", () => {
  let repository: TeamRepositoryImpl;
  const mockTeamId = new Types.ObjectId();
  const mockTeamIdString = mockTeamId.toHexString();
  const nonExistentIdString = new Types.ObjectId().toHexString();
  const mockTeamData = {
    _id: mockTeamId,
    name: "Test Team",
    lineups: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TeamRepositoryImpl();
  });

  describe("findById", () => {
    it("should return a team when found", async () => {
      (TeamModel.findById as jest.Mock).mockReturnValue(
        mockExec(mockDoc(mockTeamData)),
      );

      const result = await repository.findById(mockTeamIdString);

      expect(result).toMatchObject({ id: mockTeamIdString, name: "Test Team" });
    });

    it("should return null when team not found", async () => {
      (TeamModel.findById as jest.Mock).mockReturnValue(mockExec(null));

      const result = await repository.findById(nonExistentIdString);

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create and return a new team", async () => {
      (TeamModel.create as jest.Mock).mockResolvedValue(mockDoc(mockTeamData));

      const result = await repository.create({
        name: "Test Team",
        lineups: [],
      });

      expect(result).toMatchObject({ name: "Test Team" });
    });
  });

  describe("update", () => {
    const updatedTeamData = { ...mockTeamData, name: "Updated Team Name" };

    it("should update and return the updated team", async () => {
      (TeamModel.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockExec(mockDoc(updatedTeamData)),
      );

      const result = await repository.update(mockTeamIdString, {
        name: "Updated Team Name",
      });

      expect(result).toMatchObject({ name: "Updated Team Name" });
    });

    it("should throw NotFoundError when team is not found", async () => {
      (TeamModel.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockExec(null),
      );

      await expect(
        repository.update(nonExistentIdString, { name: "X" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateLineups", () => {
    const playerHexId = "64b000000000000000000001";
    const inputLineup: Lineup = {
      options: {
        liberoReplaceMode: 0 as const,
        liberoReplacePosition: Position.NONE,
      },
      starting: [{ id: playerHexId, position: Position.OH }, { id: null }],
      liberos: [],
      substitutes: [],
    };

    it("round-trips a filled slot id to playerId on write and back on read, and keeps an empty slot as an object slot with id null", async () => {
      // Simulate the persisted (stored) shape returned by Mongo after the write.
      const storedDoc = {
        _id: mockTeamId,
        name: "Test Team",
        lineups: [
          {
            options: inputLineup.options,
            starting: [
              { playerId: new Types.ObjectId(playerHexId), position: "OH" },
              { playerId: null },
            ],
            liberos: [],
            substitutes: [],
          },
        ],
      };
      (TeamModel.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockExec(mockDoc(storedDoc)),
      );

      const result = await repository.updateLineups(mockTeamIdString, [
        inputLineup,
      ]);

      // Write side: domain id mapped to a playerId ObjectId; empty slot is an
      // object with playerId null (never a bare null element).
      const writeArg = (TeamModel.findByIdAndUpdate as jest.Mock).mock
        .calls[0][1];
      const writtenStarting = writeArg.lineups[0].starting;
      expect(writtenStarting[0].playerId.toString()).toBe(playerHexId);
      expect(writtenStarting[1]).toMatchObject({ playerId: null });

      // Read side: stored playerId mapped back to the same domain id; empty
      // slot returns id null.
      expect(result[0]!.starting[0]!.id).toBe(playerHexId);
      expect(result[0]!.starting[1]!.id).toBeNull();
    });

    it("throws NotFoundError when the team is not found", async () => {
      (TeamModel.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockExec(null),
      );

      await expect(
        repository.updateLineups(nonExistentIdString, [inputLineup]),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should return true when deletion is successful", async () => {
      (TeamModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        mockExec(mockDoc(mockTeamData)),
      );

      const result = await repository.delete(mockTeamIdString);

      expect(result).toBe(true);
    });

    it("should return false when team not found", async () => {
      (TeamModel.findByIdAndDelete as jest.Mock).mockReturnValue(
        mockExec(null),
      );

      const result = await repository.delete(nonExistentIdString);

      expect(result).toBe(false);
    });
  });
});
