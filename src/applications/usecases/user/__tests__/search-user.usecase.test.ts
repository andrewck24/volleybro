import { createMockUserRepository } from "@test/support/doubles/repositories";
import { createMockAuthorizationService } from "@test/support/doubles/services";
import { createUser } from "@test/support/fixtures/entities";
import { SearchUserUseCase } from "@/applications/usecases/user/search-user.usecase";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/entities/errors";

describe("SearchUserUseCase", () => {
  let useCase: SearchUserUseCase;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;
  const caller = { teamId: "team-1", userId: "admin-1" };

  const foundUser = createUser({
    name: "John Doe",
    email: "john@example.com",
    image: "https://example.com/avatar.png",
  });

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new SearchUserUseCase(mockUserRepository, mockAuthService);
  });

  it("refuses a caller who is not an admin of the team", async () => {
    mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
      new AuthorizationError("NOT_TEAM_ADMIN", "Admin only"),
    );

    await expect(
      useCase.execute({ email: "john@example.com", ...caller }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
      "team-1",
      "admin-1",
    );
    expect(mockUserRepository.findAllByEmailInsensitive).not.toHaveBeenCalled();
  });

  it("should return minimal user info when found by email", async () => {
    mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([foundUser]);

    const result = await useCase.execute({
      email: "JOHN@example.com",
      ...caller,
    });

    expect(mockUserRepository.findAllByEmailInsensitive).toHaveBeenCalledWith(
      "JOHN@example.com",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("user-1");
      expect(result.value.name).toBe("John Doe");
      expect(result.value.image).toBe("https://example.com/avatar.png");
    }
  });

  it("should return NotFoundError when user not found", async () => {
    mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([]);

    const result = await useCase.execute({
      email: "notexist@example.com",
      ...caller,
    });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; error: NotFoundError };
    expect(failure.error).toBeInstanceOf(NotFoundError);
    expect(failure.error.code).toBe("NOT_FOUND");
  });

  it("should return ValidationError for invalid email format", async () => {
    const result = await useCase.execute({ email: "not-an-email", ...caller });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; error: ValidationError };
    expect(failure.error).toBeInstanceOf(ValidationError);
    expect(failure.error.code).toBe("VALIDATION");
    expect(mockUserRepository.findAllByEmailInsensitive).not.toHaveBeenCalled();
  });

  it("should return ValidationError for empty email", async () => {
    const result = await useCase.execute({ email: "", ...caller });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; error: ValidationError };
    expect(failure.error).toBeInstanceOf(ValidationError);
  });

  it("should not expose email address in result value", async () => {
    mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([foundUser]);

    const result = await useCase.execute({
      email: "john@example.com",
      ...caller,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const keys = Object.keys(result.value);
      expect(keys).toContain("id");
      expect(keys).toContain("name");
      expect(keys).not.toContain("email");
    }
  });

  it("should handle user without image", async () => {
    const userWithoutImage = createUser({
      name: "John Doe",
      email: "john@example.com",
      image: undefined,
    });
    mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([
      userWithoutImage,
    ]);

    const result = await useCase.execute({
      email: "john@example.com",
      ...caller,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.image).toBeUndefined();
    }
  });
});
