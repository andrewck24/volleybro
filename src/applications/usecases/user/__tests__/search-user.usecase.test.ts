import { createMockUserRepository, createUser } from "@/__tests__/helpers";
import { SearchUserUseCase } from "@/applications/usecases/user/search-user.usecase";
import { NotFoundError, ValidationError } from "@/entities/errors/app-error";

describe("SearchUserUseCase", () => {
  let useCase: SearchUserUseCase;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;

  const foundUser = createUser({
    name: "John Doe",
    email: "john@example.com",
    image: "https://example.com/avatar.png",
  });

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    useCase = new SearchUserUseCase(mockUserRepository);
  });

  it("should return minimal user info when found by email", async () => {
    mockUserRepository.findOne.mockResolvedValue(foundUser);

    const result = await useCase.execute("john@example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("user-1");
      expect(result.value.name).toBe("John Doe");
      expect(result.value.image).toBe("https://example.com/avatar.png");
    }
  });

  it("should return NotFoundError when user not found", async () => {
    mockUserRepository.findOne.mockResolvedValue(undefined);

    const result = await useCase.execute("notexist@example.com");

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; error: NotFoundError };
    expect(failure.error).toBeInstanceOf(NotFoundError);
    expect(failure.error.code).toBe("NOT_FOUND");
  });

  it("should return ValidationError for invalid email format", async () => {
    const result = await useCase.execute("not-an-email");

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; error: ValidationError };
    expect(failure.error).toBeInstanceOf(ValidationError);
    expect(failure.error.code).toBe("VALIDATION");
    expect(mockUserRepository.findOne).not.toHaveBeenCalled();
  });

  it("should return ValidationError for empty email", async () => {
    const result = await useCase.execute("");

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; error: ValidationError };
    expect(failure.error).toBeInstanceOf(ValidationError);
  });

  it("should not expose email address in result value", async () => {
    mockUserRepository.findOne.mockResolvedValue(foundUser);

    const result = await useCase.execute("john@example.com");

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
    mockUserRepository.findOne.mockResolvedValue(userWithoutImage);

    const result = await useCase.execute("john@example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.image).toBeUndefined();
    }
  });
});
