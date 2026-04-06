import {
  createMockProfileRepository,
  createProfile,
} from "@/__tests__/helpers";
import { CreateProfileUseCase } from "@/applications/usecases/user/profile.usecase";

describe("CreateProfileUseCase", () => {
  let useCase: CreateProfileUseCase;
  let mockProfileRepository: ReturnType<typeof createMockProfileRepository>;

  const mockProfile = createProfile();

  beforeEach(() => {
    mockProfileRepository = createMockProfileRepository();
    useCase = new CreateProfileUseCase(mockProfileRepository);
  });

  it("should return new profile when none exists", async () => {
    mockProfileRepository.findByUserId.mockResolvedValue(null);
    mockProfileRepository.create.mockResolvedValue(mockProfile);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.id).toBe("profile-1");
    expect(result.userId).toBe("user-1");
  });

  it("should return existing profile without creating a new one (idempotent)", async () => {
    mockProfileRepository.findByUserId.mockResolvedValue(mockProfile);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.id).toBe("profile-1");
    expect(mockProfileRepository.create).not.toHaveBeenCalled();
  });

  it("should propagate errors thrown by repository", async () => {
    mockProfileRepository.findByUserId.mockRejectedValue(
      new Error("DB connection lost"),
    );

    await expect(useCase.execute({ userId: "user-1" })).rejects.toThrow();
  });
});
