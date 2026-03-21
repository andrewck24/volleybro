import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { User } from "@/entities/user";
import { AuthenticationError } from "@/entities/errors/app-error";
import { AuthenticationService } from "@/infrastructure/services/auth/authentication.service";

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

import { auth } from "@/lib/auth";
const mockGetSession = auth.api.getSession as jest.Mock;

describe("AuthenticationService", () => {
  let service: AuthenticationService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockUser: User = {
    _id: "user-1",
    name: "Test User",
    email: "test@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    service = new AuthenticationService(mockUserRepository);
  });

  describe("invalid session → AuthenticationError", () => {
    it("throws AuthenticationError when session is null", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(service.verifySession()).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });
  });

  describe("user not found → AuthenticationError", () => {
    it("throws AuthenticationError when user does not exist in repository", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verifySession()).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });
  });

  describe("valid session", () => {
    it("returns user when session and user are valid", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.verifySession();
      expect(result).toBe(mockUser);
    });
  });
});
