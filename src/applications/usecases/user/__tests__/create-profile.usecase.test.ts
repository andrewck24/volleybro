import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { CreateProfileUseCase } from "../profile.usecase";

describe("CreateProfileUseCase", () => {
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

  it("should return new profile when none exists", async () => {
    mockProfileRepository.findByUserId.mockResolvedValue(null);
    mockProfileRepository.create.mockResolvedValue(mockProfile);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result._id).toBe("profile-1");
    expect(result.userId).toBe("user-1");
    expect(mockProfileRepository.create).toHaveBeenCalledWith({
      userId: "user-1",
    });
  });

  it("should return existing profile without creating a new one (idempotent)", async () => {
    mockProfileRepository.findByUserId.mockResolvedValue(mockProfile);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result._id).toBe("profile-1");
    expect(mockProfileRepository.create).not.toHaveBeenCalled();
  });

  it("should propagate errors thrown by repository", async () => {
    mockProfileRepository.findByUserId.mockRejectedValue(
      new Error("DB connection lost")
    );

    await expect(useCase.execute({ userId: "user-1" })).rejects.toThrow();
  });
});
