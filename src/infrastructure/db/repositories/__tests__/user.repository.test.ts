import { NotFoundError } from "@/entities/errors/app-error";
import { User as UserModel } from "@/infrastructure/db/mongoose/schemas/user";
import { UserRepositoryImpl } from "@/infrastructure/db/repositories/user.repository.mongo";
import { Types } from "mongoose";

jest.mock("@/infrastructure/db/mongoose/schemas/user", () => {
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

  return { User: mockModel };
});

describe("UserRepositoryImpl", () => {
  let repository: UserRepositoryImpl;
  const mockUserId = new Types.ObjectId();
  const mockUserIdString = mockUserId.toHexString();
  const nonExistentId = new Types.ObjectId();
  const nonExistentIdString = nonExistentId.toHexString();
  const mockUserData = {
    id: mockUserId,
    name: "Test User",
    email: "test@test.com",
  };

  const mockDoc = (data: Record<string, unknown>) => ({
    toJSON: jest.fn().mockReturnValue(data),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserRepositoryImpl();
  });

  describe("find", () => {
    it("should return an array of users", async () => {
      (UserModel.find as jest.Mock).mockResolvedValue([mockDoc(mockUserData)]);

      const result = await repository.find({ name: "Test User" });

      expect(result).toEqual([mockUserData]);
    });

    it("should return empty array if no users found", async () => {
      (UserModel.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.find({ name: "Non Existent" });

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a single user", async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockDoc(mockUserData));

      const result = await repository.findOne({ id: mockUserIdString });

      expect(result).toEqual(mockUserData);
    });

    it("should return undefined if user not found", async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findOne({ id: nonExistentIdString });

      expect(result).toBeUndefined();
    });
  });

  describe("create", () => {
    it("should create and return a new user", async () => {
      const result = await repository.create({
        ...mockUserData,
        id: mockUserIdString,
      });

      expect(result).toEqual({
        ...mockUserData,
        id: mockUserIdString,
      });
    });
  });

  describe("update", () => {
    const updatedUserData = {
      ...mockUserData,
      id: mockUserIdString,
      name: "Updated Name",
    };

    it("should update and return the updated user", async () => {
      (UserModel.findOneAndReplace as jest.Mock).mockResolvedValue(
        mockDoc(updatedUserData),
      );

      const result = await repository.update(
        { id: mockUserIdString },
        updatedUserData,
      );

      expect(result).toEqual(updatedUserData);
    });

    it("should throw NotFoundError if user not found", async () => {
      (UserModel.findOneAndReplace as jest.Mock).mockResolvedValue(null);

      await expect(
        repository.update({ id: nonExistentId }, updatedUserData),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should return true when deletion is successful", async () => {
      (UserModel.findOneAndDelete as jest.Mock).mockResolvedValue(
        mockDoc(mockUserData),
      );

      const result = await repository.delete({ id: mockUserId });

      expect(result).toBe(true);
    });

    it("should return false if user not found", async () => {
      (UserModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await repository.delete({ id: nonExistentId });

      expect(result).toBe(false);
    });
  });
});
