import { createMockPlayerRepository } from "@/__tests__/helpers";
import { LinkPendingInvitationsUseCase } from "@/applications/usecases/user/link-pending-invitations.usecase";

describe("LinkPendingInvitationsUseCase", () => {
  let useCase: LinkPendingInvitationsUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    useCase = new LinkPendingInvitationsUseCase(mockPlayerRepository);
  });

  it("should return count of linked invitations on success", async () => {
    mockPlayerRepository.linkUserToInvitations.mockResolvedValue(3);

    const result = await useCase.execute("test@example.com", "user-1");

    expect(result).toBe(3);
  });

  it("should return 0 when no invitations are found", async () => {
    mockPlayerRepository.linkUserToInvitations.mockResolvedValue(0);

    const result = await useCase.execute("noone@example.com", "user-2");

    expect(result).toBe(0);
  });

  it("should be idempotent — second execution returns 0 without error", async () => {
    mockPlayerRepository.linkUserToInvitations
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    const first = await useCase.execute("test@example.com", "user-1");
    const second = await useCase.execute("test@example.com", "user-1");

    expect(first).toBe(2);
    expect(second).toBe(0);
  });

  it("should propagate errors thrown by repository", async () => {
    mockPlayerRepository.linkUserToInvitations.mockRejectedValue(
      new Error("DB connection lost"),
    );

    await expect(
      useCase.execute("test@example.com", "user-1"),
    ).rejects.toThrow();
  });
});
