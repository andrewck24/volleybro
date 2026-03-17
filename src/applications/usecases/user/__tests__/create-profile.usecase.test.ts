import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { TransientError } from "@/applications/errors/app-error";
import { CreateProfileUseCase } from "../profile.usecase";

describe("CreateProfileUseCase — Result<Profile>", () => {
  let useCase: CreateProfileUseCase;
  let mockProfileRepository: jest.Mocked<IProfileRepository>;

  const mockProfile = {
    _id: "profile-1",
    userId: "user-1",
  };

  beforeEach(() => {
    mockProfileRepository = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateActiveTeamId: jest.fn(),
    } as jest.Mocked<IProfileRepository>;

    useCase = new CreateProfileUseCase(mockProfileRepository);
  });

  it("should return ok with new profile when none exists", async () => {
    mockProfileRepository.findByUserId.mockResolvedValue(null);
    mockProfileRepository.create.mockResolvedValue(mockProfile);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value._id).toBe("profile-1");
      expect(result.value.userId).toBe("user-1");
    }
    expect(mockProfileRepository.create).toHaveBeenCalledWith({
      userId: "user-1",
    });
  });

  it("should return ok with existing profile (idempotent)", async () => {
    mockProfileRepository.findByUserId.mockResolvedValue(mockProfile);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value._id).toBe("profile-1");
    }
    expect(mockProfileRepository.create).not.toHaveBeenCalled();
  });

  it("should return TransientError when DB operation fails", async () => {
    mockProfileRepository.findByUserId.mockRejectedValue(
      new Error("DB connection lost")
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(TransientError);
      expect(result.error.isTransient).toBe(true);
    }
  });

  it("should return TransientError when create fails", async () => {
    mockProfileRepository.findByUserId.mockResolvedValue(null);
    mockProfileRepository.create.mockRejectedValue(new Error("Write failed"));

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(TransientError);
    }
  });
});
