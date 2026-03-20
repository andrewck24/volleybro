import { NotFoundError, ValidationError } from "@/entities/errors/app-error";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { SearchUserUseCase } from "../search-user.usecase";

describe("SearchUserUseCase", () => {
  let useCase: SearchUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const foundUser = {
    _id: "user-1",
    name: "John Doe",
    email: "john@example.com",
    image: "https://example.com/avatar.png",
  };

  beforeEach(() => {
    mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    useCase = new SearchUserUseCase(mockUserRepository);
  });

  it("should return minimal user info when found by email", async () => {
    mockUserRepository.findOne.mockResolvedValue(foundUser);

    const result = await useCase.execute("john@example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value._id).toBe("user-1");
      expect(result.value.name).toBe("John Doe");
      expect(result.value.image).toBe("https://example.com/avatar.png");
    }
    expect(mockUserRepository.findOne).toHaveBeenCalledWith({
      email: "john@example.com",
    });
  });

  it("should return NotFoundError when user not found", async () => {
    mockUserRepository.findOne.mockResolvedValue(undefined);

    const result = await useCase.execute("notexist@example.com");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("should return ValidationError for invalid email format", async () => {
    const result = await useCase.execute("not-an-email");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.code).toBe("VALIDATION");
    }
    expect(mockUserRepository.findOne).not.toHaveBeenCalled();
  });

  it("should return ValidationError for empty email", async () => {
    const result = await useCase.execute("");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it("should not expose email address in result value", async () => {
    mockUserRepository.findOne.mockResolvedValue(foundUser);

    const result = await useCase.execute("john@example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      const keys = Object.keys(result.value);
      expect(keys).toContain("_id");
      expect(keys).toContain("name");
      expect(keys).not.toContain("email");
    }
  });

  it("should handle user without image", async () => {
    const userWithoutImage = { ...foundUser, image: undefined };
    mockUserRepository.findOne.mockResolvedValue(userWithoutImage);

    const result = await useCase.execute("john@example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.image).toBeUndefined();
    }
  });
});
