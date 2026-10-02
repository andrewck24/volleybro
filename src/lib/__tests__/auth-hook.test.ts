import { createProfile } from "@test/support/fixtures/entities";
import {
  createMockPlayerRepository,
  createMockProfileRepository,
} from "@test/support/doubles/repositories";
import { TransientError, CommonReason } from "@/entities/errors";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { handleUserCreated } from "@/lib/auth-hook";

// The container loads the session provider, which opens its own database client on import.
jest.mock("@/lib/auth", () => ({ auth: { api: {} } }));

describe("handleUserCreated (auth hook)", () => {
  const profileRepository = createMockProfileRepository();
  const playerRepository = createMockPlayerRepository();

  beforeAll(() => {
    // The real use cases run; only the database-backed repositories are replaced.
    container
      .rebind(TYPES.ProfileRepository)
      .toConstantValue(profileRepository);
    container.rebind(TYPES.PlayerRepository).toConstantValue(playerRepository);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    profileRepository.findByUserId.mockResolvedValue(null);
  });

  it("should create profile then link pending invitations on success", async () => {
    profileRepository.create.mockResolvedValue(createProfile());
    playerRepository.linkUserToInvitations.mockResolvedValue(2);

    await handleUserCreated({ id: "user-1", email: "test@example.com" });

    expect(profileRepository.create).toHaveBeenCalledWith({ userId: "user-1" });
    expect(playerRepository.linkUserToInvitations).toHaveBeenCalledWith(
      "test@example.com",
      "user-1",
    );
  });

  it("should retry LinkPendingInvitationsUseCase once on transient failure", async () => {
    profileRepository.create.mockResolvedValue(createProfile());
    playerRepository.linkUserToInvitations
      .mockRejectedValueOnce(
        new TransientError(CommonReason.UNHANDLED_ERROR, "DB timeout"),
      )
      .mockResolvedValueOnce(1);

    await handleUserCreated({ id: "user-1", email: "test@example.com" });

    expect(playerRepository.linkUserToInvitations).toHaveBeenCalledTimes(2);
  });

  it("should log and continue if both link invitations attempts fail", async () => {
    profileRepository.create.mockResolvedValue(createProfile());
    playerRepository.linkUserToInvitations.mockRejectedValue(
      new TransientError(CommonReason.UNHANDLED_ERROR, "DB timeout"),
    );

    await expect(
      handleUserCreated({ id: "user-1", email: "test@example.com" }),
    ).resolves.not.toThrow();

    expect(playerRepository.linkUserToInvitations).toHaveBeenCalledTimes(2);
  });

  it("should log and continue if profile creation fails", async () => {
    profileRepository.create.mockRejectedValue(new Error("DB timeout"));

    await expect(
      handleUserCreated({ id: "user-1", email: "test@example.com" }),
    ).resolves.not.toThrow();

    expect(playerRepository.linkUserToInvitations).not.toHaveBeenCalled();
  });
});
