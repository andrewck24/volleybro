import { TransientError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { handleUserCreated } from "@/lib/auth-hook";
import { createProfile } from "@/__tests__/helpers";

// Mock the DI container dependencies
jest.mock("@/infrastructure/di/inversify.config", () => ({
  container: {
    get: jest.fn(),
  },
}));

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: jest.fn().mockResolvedValue(undefined),
}));

import { container } from "@/infrastructure/di/inversify.config";
const mockContainer = container as jest.Mocked<typeof container>;

describe("handleUserCreated (auth hook)", () => {
  let mockCreateProfileExecute: jest.Mock;
  let mockLinkInvitationsExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateProfileExecute = jest.fn();
    mockLinkInvitationsExecute = jest.fn();

    mockContainer.get.mockImplementation((token: symbol) => {
      if (token.toString() === "Symbol(CreateProfileUseCase)") {
        return { execute: mockCreateProfileExecute };
      }
      if (token.toString() === "Symbol(LinkPendingInvitationsUseCase)") {
        return { execute: mockLinkInvitationsExecute };
      }
      throw new Error(`Unknown token: ${String(token)}`);
    });
  });

  it("should create profile then link pending invitations on success", async () => {
    const mockProfile = createProfile();
    mockCreateProfileExecute.mockResolvedValue(mockProfile);
    mockLinkInvitationsExecute.mockResolvedValue(2);

    await handleUserCreated({ id: "user-1", email: "test@example.com" });

    expect(mockCreateProfileExecute).toHaveBeenCalledWith({ userId: "user-1" });
    expect(mockLinkInvitationsExecute).toHaveBeenCalledWith(
      "test@example.com",
      "user-1"
    );
  });

  it("should retry LinkPendingInvitationsUseCase once on transient failure", async () => {
    const mockProfile = createProfile();
    mockCreateProfileExecute.mockResolvedValue(mockProfile);
    mockLinkInvitationsExecute
      .mockRejectedValueOnce(
        new TransientError(CommonReason.UNHANDLED_ERROR, "DB timeout")
      )
      .mockResolvedValueOnce(1);

    await handleUserCreated({ id: "user-1", email: "test@example.com" });

    expect(mockLinkInvitationsExecute).toHaveBeenCalledTimes(2);
  });

  it("should log and continue if both link invitations attempts fail", async () => {
    const mockProfile = createProfile();
    mockCreateProfileExecute.mockResolvedValue(mockProfile);
    mockLinkInvitationsExecute.mockRejectedValue(
      new TransientError(CommonReason.UNHANDLED_ERROR, "DB timeout")
    );

    await expect(
      handleUserCreated({ id: "user-1", email: "test@example.com" })
    ).resolves.not.toThrow();

    expect(mockLinkInvitationsExecute).toHaveBeenCalledTimes(2);
  });

  it("should log and continue if profile creation fails", async () => {
    mockCreateProfileExecute.mockRejectedValue(new Error("DB timeout"));

    await expect(
      handleUserCreated({ id: "user-1", email: "test@example.com" })
    ).resolves.not.toThrow();

    expect(mockLinkInvitationsExecute).not.toHaveBeenCalled();
  });
});
