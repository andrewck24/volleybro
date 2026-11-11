import {
  createMockPlayerRepository,
  createMockTeamRepository,
} from "@test/support/doubles/repositories";
import {
  createInvitedPlayer,
  createPlayer,
  createTeam,
} from "@test/support/fixtures/entities";
import { GetUserPlayersUseCase } from "@/applications/usecases/player/get-user-players.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("GetUserPlayersUseCase", () => {
  let usecase: GetUserPlayersUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;

  const email = "alice@example.com";

  const mockPlayers = [
    createPlayer({
      id: "player-1",
      name: "User",
      status: PlayerStatus.JOINED,
    }),
    createPlayer({
      id: "player-2",
      name: "User",
      teamId: "team-2",
      status: PlayerStatus.JOINED,
      role: PlayerRole.ADMIN,
    }),
  ];

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockTeamRepository = createMockTeamRepository();
    mockTeamRepository.findById.mockImplementation(async (id: string) =>
      createTeam({ id, name: `Team ${id}` }),
    );
    usecase = new GetUserPlayersUseCase(
      mockPlayerRepository,
      mockTeamRepository,
    );
  });

  it("should return all players for a user with their teamName", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toEqual([
      { ...mockPlayers[0], teamName: "Team team-1" },
      { ...mockPlayers[1], teamName: "Team team-2" },
    ]);
  });

  it("should keep the entry with no teamName when its team cannot be found", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );
    mockTeamRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.teamName === undefined)).toBe(true);
  });

  it("should return empty array if user has no players", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue([]);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toEqual([]);
  });

  it("should return multiple players for user", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toHaveLength(2);
    expect(result[0]!.teamId).toBe("team-1");
    expect(result[1]!.teamId).toBe("team-2");
  });

  it("should include both MEMBER and ADMIN roles", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result[0]).toMatchObject({ role: PlayerRole.MEMBER });
    expect(result[1]).toMatchObject({ role: PlayerRole.ADMIN });
  });

  it("should include status field in results", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result.every((p) => p.status === PlayerStatus.JOINED)).toBe(true);
  });

  it("should include userId field in results", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    const result = await usecase.execute({ userId: "user-1", email });

    expect(
      result.every(
        (p) => p.status === PlayerStatus.JOINED && p.userId === "user-1",
      ),
    ).toBe(true);
  });

  it("looks up by the normalized address", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue([]);

    await usecase.execute({ userId: "user-1", email: "  Alice@Example.COM " });

    expect(
      mockPlayerRepository.findByUserIdOrInvitedEmail,
    ).toHaveBeenCalledWith("user-1", "alice@example.com");
  });

  it("links a waiting email invitation and returns it as linked", async () => {
    const invited = createInvitedPlayer({
      id: "player-3",
      teamId: "team-3",
      email,
    });
    const linked = createInvitedPlayer({
      id: "player-3",
      teamId: "team-3",
      userId: "user-1",
    });
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue([
      ...mockPlayers,
      invited,
    ]);
    mockPlayerRepository.linkUserToInvitations.mockResolvedValue(1);
    mockPlayerRepository.findByUserId.mockResolvedValue([
      ...mockPlayers,
      linked,
    ]);

    const result = await usecase.execute({
      userId: "user-1",
      email: "  Alice@Example.COM ",
    });

    expect(mockPlayerRepository.linkUserToInvitations).toHaveBeenCalledWith(
      "alice@example.com",
      "user-1",
    );
    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({ id: "player-3", userId: "user-1" });
    expect(result[2]).not.toHaveProperty("email");
  });

  it("does not link when no email invitation is waiting", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    await usecase.execute({ userId: "user-1", email });

    expect(mockPlayerRepository.linkUserToInvitations).not.toHaveBeenCalled();
    expect(mockPlayerRepository.findByUserId).not.toHaveBeenCalled();
  });
});
