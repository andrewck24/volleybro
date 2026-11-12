import { createMockPlayerRepository } from "@test/support/doubles/repositories";
import { TransientError, CommonReason } from "@/entities/errors";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { handleUserCreated } from "@/lib/auth-hook";

// The container loads the session provider, which opens its own database client on import.
jest.mock("@/lib/auth", () => ({ auth: { api: {} } }));

describe("handleUserCreated (auth hook)", () => {
  const playerRepository = createMockPlayerRepository();

  beforeAll(() => {
    // The real use cases run; only the database-backed repositories are replaced.
    container.rebind(TYPES.PlayerRepository).toConstantValue(playerRepository);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("connects to the database before linking pending invitations", async () => {
    const order: string[] = [];
    jest.mocked(connectToMongoDB).mockImplementation(async () => {
      order.push("connect");
      return undefined as never;
    });
    playerRepository.linkUserToInvitations.mockImplementation(async () => {
      order.push("link");
      return 2;
    });

    await handleUserCreated({ id: "user-1", email: "test@example.com" });

    expect(order).toEqual(["connect", "link"]);
    expect(playerRepository.linkUserToInvitations).toHaveBeenCalledWith(
      "test@example.com",
      "user-1",
    );
  });

  it("logs connection failures and continues the auth flow", async () => {
    jest.mocked(connectToMongoDB).mockRejectedValue(new Error("no server"));
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    playerRepository.linkUserToInvitations.mockResolvedValue(1);

    await expect(
      handleUserCreated({ id: "user-1", email: "test@example.com" }),
    ).resolves.toBeUndefined();

    expect(log).toHaveBeenCalled();
    expect(playerRepository.linkUserToInvitations).toHaveBeenCalledWith(
      "test@example.com",
      "user-1",
    );
    log.mockRestore();
  });

  it("should retry LinkPendingInvitationsUseCase once on transient failure", async () => {
    playerRepository.linkUserToInvitations
      .mockRejectedValueOnce(
        new TransientError(CommonReason.UNHANDLED_ERROR, "DB timeout"),
      )
      .mockResolvedValueOnce(1);

    await handleUserCreated({ id: "user-1", email: "test@example.com" });

    expect(playerRepository.linkUserToInvitations).toHaveBeenCalledTimes(2);
  });

  it("should log and continue if both link invitations attempts fail", async () => {
    playerRepository.linkUserToInvitations.mockRejectedValue(
      new TransientError(CommonReason.UNHANDLED_ERROR, "DB timeout"),
    );

    await expect(
      handleUserCreated({ id: "user-1", email: "test@example.com" }),
    ).resolves.not.toThrow();

    expect(playerRepository.linkUserToInvitations).toHaveBeenCalledTimes(2);
  });
});
