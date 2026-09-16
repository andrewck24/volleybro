import { createInvitedPlayer } from "@/__tests__/helpers";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { acceptInvitation } from "@/interface/controllers/player/invitation.controller";

jest.mock("@/infrastructure/di/inversify.config", () => ({
  container: { get: jest.fn() },
}));

const containerGet = container.get as jest.Mock;

describe("acceptInvitation", () => {
  const invitedPlayer = createInvitedPlayer({ userId: "user-1" });
  const execute = jest.fn();
  const updateProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    execute.mockResolvedValue(invitedPlayer);
    containerGet.mockImplementation((serviceIdentifier: unknown) => {
      if (serviceIdentifier === TYPES.AcceptInvitationUseCase)
        return { execute };
      if (serviceIdentifier === TYPES.UpdateProfileUseCase)
        return { execute: updateProfile };
      throw new Error(`Unexpected use case: ${String(serviceIdentifier)}`);
    });
  });

  it("takes the team from the accepted invitation, not a members-only read", async () => {
    await acceptInvitation({ playerId: "player-1", userId: "user-1" });

    expect(containerGet).not.toHaveBeenCalledWith(TYPES.GetPlayerUseCase);
    expect(updateProfile).toHaveBeenCalledWith({
      userId: "user-1",
      updates: { activeTeamId: "team-1" },
    });
  });

  it("accepts before it updates the profile", async () => {
    const order: string[] = [];
    execute.mockImplementation(async () => {
      order.push("accept");
      return invitedPlayer;
    });
    updateProfile.mockImplementation(async () => {
      order.push("profile");
    });

    await acceptInvitation({ playerId: "player-1", userId: "user-1" });

    expect(order).toEqual(["accept", "profile"]);
  });

  it("skips the profile update when the invitation has no team", async () => {
    execute.mockResolvedValue(
      createInvitedPlayer({ userId: "user-1", teamId: undefined }),
    );

    await acceptInvitation({ playerId: "player-1", userId: "user-1" });

    expect(updateProfile).not.toHaveBeenCalled();
  });
});
