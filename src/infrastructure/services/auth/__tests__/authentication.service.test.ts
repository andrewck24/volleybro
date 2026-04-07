import { createMockUserRepository, createUser } from "@/__tests__/helpers";
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
const mockGetSession = auth.api.getSession as unknown as jest.Mock;

describe("AuthenticationService", () => {
  let service: AuthenticationService;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;

  const mockUser = createUser();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepository = createMockUserRepository();
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
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.verifySession()).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });
  });

  describe("valid session", () => {
    it("returns user when session and user are valid", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.verifySession();
      expect(result).toBe(mockUser);
    });
  });
});
