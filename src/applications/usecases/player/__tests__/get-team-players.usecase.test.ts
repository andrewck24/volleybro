import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { GetTeamPlayersUseCase } from "@/applications/usecases/player/get-team-players.usecase";
import { Player, PlayerRole } from "@/entities/player";

describe("GetTeamPlayersUseCase", () => {
  let usecase: GetTeamPlayersUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const teamPlayers: Player[] = [
    {
      _id: "player-1",
      name: "Member User",
      teamId: "team-1",
      userId: "user-1",
      email: "member@example.com",
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "player-2",
      name: "invited",
      teamId: "team-1",
      email: "invited@example.com",
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "player-3",
      name: "Pure Player",
      teamId: "team-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockPlayerRepository = {
      findByTeamId: jest.fn(),
      findById: jest.fn(),
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
    } as jest.Mocked<IPlayerRepository>;

    usecase = new GetTeamPlayersUseCase(mockPlayerRepository);
  });

  it("should return all players in team", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute("team-1");

    expect(result).toEqual(teamPlayers);
    expect(mockPlayerRepository.findByTeamId).toHaveBeenCalledWith("team-1");
  });

  it("should return empty array if team has no players", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue([]);

    const result = await usecase.execute("team-1");

    expect(result).toEqual([]);
  });

  it("should include members, invitees, and pure players", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute("team-1");

    expect(result).toHaveLength(3);
    expect(result[0].userId).toBeDefined(); // Member
    expect(result[1].email).toBeDefined(); // Invitee
    expect(result[1].userId).toBeUndefined(); // Invitee
    expect(result[2].email).toBeUndefined(); // Pure player
    expect(result[2].userId).toBeUndefined(); // Pure player
  });

  it("should include all player information", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute("team-1");

    result.forEach((player) => {
      expect(player._id).toBeDefined();
      expect(player.name).toBeDefined();
      expect(player.teamId).toBe("team-1");
      expect(player.createdAt).toBeDefined();
      expect(player.updatedAt).toBeDefined();
    });
  });
});
