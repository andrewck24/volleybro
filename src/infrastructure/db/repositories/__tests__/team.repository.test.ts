import { NotFoundError } from "@/entities/errors/app-error";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { TeamRepositoryImpl } from "@/infrastructure/db/repositories/team.repository.mongo";
import { Types } from "mongoose";

jest.mock("@/infrastructure/db/mongoose/schemas/team", () => {
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
  });

  return { Team: mockModel };
});

describe("TeamRepositoryImpl", () => {
  let repository: TeamRepositoryImpl;
  const mockTeamId = new Types.ObjectId();
  const mockTeamIdString = mockTeamId.toHexString();
  const nonExistentId = new Types.ObjectId();
  const nonExistentIdString = nonExistentId.toHexString();
  const mockTeamData = {
    id: mockTeamId,
    name: "Test Team",
    members: [],
  };

  const mockDoc = (data: Record<string, unknown>) => ({
    toJSON: jest.fn().mockReturnValue(data),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TeamRepositoryImpl();
  });

  describe("find", () => {
    it("should return array of teams", async () => {
      (TeamModel.find as jest.Mock).mockResolvedValue([mockDoc(mockTeamData)]);

      const result = await repository.find({ name: "Test Team" });

      expect(result).toEqual([mockTeamData]);
    });

    it("should return empty array if no teams found", async () => {
      (TeamModel.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.find({ name: "Non Existent" });

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a single team", async () => {
      (TeamModel.findOne as jest.Mock).mockResolvedValue(mockDoc(mockTeamData));

      const result = await repository.findOne({ id: mockTeamIdString });

      expect(result).toEqual(mockTeamData);
    });

    it("should return undefined if team not found", async () => {
      (TeamModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findOne({ id: nonExistentIdString });

      expect(result).toBeUndefined();
    });
  });

  describe("create", () => {
    it("should create and return a new team", async () => {
      const result = await repository.create({
        ...mockTeamData,
        id: mockTeamIdString,
      });

      expect(result).toEqual({
        ...mockTeamData,
        id: mockTeamIdString,
      });
    });
  });

  describe("update", () => {
    const updatedTeamData = {
      ...mockTeamData,
      id: mockTeamIdString,
      name: "Updated Team Name",
    };

    it("should update and return the updated team", async () => {
      (TeamModel.findOneAndReplace as jest.Mock).mockResolvedValue(
        mockDoc(updatedTeamData),
      );

      const result = await repository.update(
        { id: mockTeamId },
        updatedTeamData,
      );

      expect(result).toEqual(updatedTeamData);
    });

    it("should throw NotFoundError when team is not found", async () => {
      (TeamModel.findOneAndReplace as jest.Mock).mockResolvedValue(null);

      await expect(
        repository.update({ id: nonExistentId }, updatedTeamData),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should return true when deletion is successful", async () => {
      (TeamModel.findOneAndDelete as jest.Mock).mockResolvedValue(
        mockDoc(mockTeamData),
      );

      const result = await repository.delete({ id: mockTeamId });

      expect(result).toBe(true);
    });

    it("should return false when deletion fails", async () => {
      (TeamModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await repository.delete({ id: nonExistentId });

      expect(result).toBe(false);
    });
  });
});
