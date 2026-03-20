import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { LinkPendingInvitationsUseCase } from "../link-pending-invitations.usecase";

describe("LinkPendingInvitationsUseCase", () => {
  let useCase: LinkPendingInvitationsUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  beforeEach(() => {
    mockPlayerRepository = {
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      findInvitedByTeamIdAndEmail: jest.fn(),
      findByTeamIdAndUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByTeamId: jest.fn(),
      findTeamOwner: jest.fn(),
      findAdminsByTeamId: jest.fn(),
      existsInvitation: jest.fn(),
      linkUserToInvitations: jest.fn(),
    } as jest.Mocked<IPlayerRepository>;

    useCase = new LinkPendingInvitationsUseCase(mockPlayerRepository);
  });

  it("should return count of linked invitations on success", async () => {
    mockPlayerRepository.linkUserToInvitations.mockResolvedValue(3);

    const result = await useCase.execute("test@example.com", "user-1");

    expect(result).toBe(3);
    expect(mockPlayerRepository.linkUserToInvitations).toHaveBeenCalledWith(
      "test@example.com",
      "user-1"
    );
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
      new Error("DB connection lost")
    );

    await expect(
      useCase.execute("test@example.com", "user-1")
    ).rejects.toThrow();
  });
});
