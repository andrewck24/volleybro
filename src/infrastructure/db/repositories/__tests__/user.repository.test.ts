import { mockDoc, mockExec } from "@/__tests__/helpers";
import { User as UserModel } from "@/infrastructure/db/mongoose/schemas/user";
import { UserRepositoryImpl } from "@/infrastructure/db/repositories/user.repository.mongo";
import { Types } from "mongoose";

jest.mock("@/infrastructure/db/mongoose/schemas/user", () => {
  const mockModel = jest.fn();
  Object.assign(mockModel, {
    findById: jest.fn(),
    findOne: jest.fn(),
  });
  return { User: mockModel };
});

describe("UserRepositoryImpl", () => {
  let repository: UserRepositoryImpl;
  const mockUserId = new Types.ObjectId();
  const mockUserIdString = mockUserId.toHexString();
  const mockUserData = {
    _id: mockUserId,
    name: "Test User",
    email: "test@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserRepositoryImpl();
  });

  describe("findById", () => {
    it("should return a user when found", async () => {
      (UserModel.findById as jest.Mock).mockReturnValue(
        mockExec(mockDoc(mockUserData)),
      );

      const result = await repository.findById(mockUserIdString);

      expect(result).toMatchObject({ id: mockUserIdString, name: "Test User" });
    });

    it("should return null when user not found", async () => {
      (UserModel.findById as jest.Mock).mockReturnValue(mockExec(null));

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should return a user when found by email", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue(
        mockExec(mockDoc(mockUserData)),
      );

      const result = await repository.findByEmail("test@test.com");

      expect(result).toMatchObject({ email: "test@test.com" });
    });

    it("should return null when user not found by email", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue(mockExec(null));

      const result = await repository.findByEmail("notexist@test.com");

      expect(result).toBeNull();
    });
  });
});
