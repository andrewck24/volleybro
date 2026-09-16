import { ValidationError } from "@/entities/errors";
import {
  canManageTeam,
  hasTeamRole,
  isOwner,
  isTeamMember,
  narrowPlayer,
  type PlayerFields,
  PlayerRole,
  PlayerStatus,
  type TeamMember,
} from "@/entities/player";

const fields = (overrides: Partial<PlayerFields> = {}): PlayerFields => ({
  id: "player-1",
  name: "Test Player",
  teamId: "team-1",
  status: PlayerStatus.NONE,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const member = (role: PlayerRole): TeamMember =>
  narrowPlayer(
    fields({ status: PlayerStatus.JOINED, userId: "user-1", role }),
  ) as TeamMember;

describe("Player Entity", () => {
  describe("narrowPlayer", () => {
    it("narrows an unlinked player", () => {
      expect(narrowPlayer(fields()).status).toBe(PlayerStatus.NONE);
    });

    it("narrows an invitee reachable by email", () => {
      const player = narrowPlayer(
        fields({
          status: PlayerStatus.INVITED,
          email: "alice@example.com",
          role: PlayerRole.MEMBER,
        }),
      );

      expect(player.status).toBe(PlayerStatus.INVITED);
    });

    it("narrows an invitee reachable by userId", () => {
      const player = narrowPlayer(
        fields({
          status: PlayerStatus.INVITED,
          userId: "user-1",
          role: PlayerRole.ADMIN,
        }),
      );

      expect(player.status).toBe(PlayerStatus.INVITED);
    });

    it("narrows a team member", () => {
      const player = narrowPlayer(
        fields({
          status: PlayerStatus.JOINED,
          userId: "user-1",
          role: PlayerRole.OWNER,
        }),
      );

      expect(player.status).toBe(PlayerStatus.JOINED);
    });

    it("rejects a document without a status", () => {
      expect(() =>
        narrowPlayer(fields({ status: undefined as unknown as PlayerStatus })),
      ).toThrow(ValidationError);
    });

    it("rejects an unknown status", () => {
      expect(() =>
        narrowPlayer(fields({ status: "ARCHIVED" as PlayerStatus })),
      ).toThrow(ValidationError);
    });

    it("rejects an unlinked player carrying a role", () => {
      expect(() => narrowPlayer(fields({ role: PlayerRole.MEMBER }))).toThrow(
        ValidationError,
      );
    });

    it("rejects an unlinked player carrying a userId", () => {
      expect(() => narrowPlayer(fields({ userId: "user-1" }))).toThrow(
        ValidationError,
      );
    });

    it("rejects an unlinked player carrying an email", () => {
      expect(() =>
        narrowPlayer(fields({ email: "alice@example.com" })),
      ).toThrow(ValidationError);
    });

    it("rejects an invitee without a role", () => {
      expect(() =>
        narrowPlayer(
          fields({
            status: PlayerStatus.INVITED,
            email: "alice@example.com",
          }),
        ),
      ).toThrow(ValidationError);
    });

    it("rejects an invitee with both userId and email", () => {
      expect(() =>
        narrowPlayer(
          fields({
            status: PlayerStatus.INVITED,
            userId: "user-1",
            email: "alice@example.com",
            role: PlayerRole.MEMBER,
          }),
        ),
      ).toThrow(ValidationError);
    });

    it("rejects an invitee with neither userId nor email", () => {
      expect(() =>
        narrowPlayer(
          fields({ status: PlayerStatus.INVITED, role: PlayerRole.MEMBER }),
        ),
      ).toThrow(ValidationError);
    });

    it("rejects a member without a userId", () => {
      expect(() =>
        narrowPlayer(
          fields({ status: PlayerStatus.JOINED, role: PlayerRole.MEMBER }),
        ),
      ).toThrow(ValidationError);
    });

    it("rejects a member without a role", () => {
      expect(() =>
        narrowPlayer(fields({ status: PlayerStatus.JOINED, userId: "user-1" })),
      ).toThrow(ValidationError);
    });

    it("rejects a member carrying an email", () => {
      expect(() =>
        narrowPlayer(
          fields({
            status: PlayerStatus.JOINED,
            userId: "user-1",
            email: "alice@example.com",
            role: PlayerRole.MEMBER,
          }),
        ),
      ).toThrow(ValidationError);
    });
  });

  describe("isTeamMember", () => {
    it("accepts a joined player", () => {
      expect(isTeamMember(member(PlayerRole.MEMBER))).toBe(true);
    });

    it.each([PlayerRole.MEMBER, PlayerRole.ADMIN, PlayerRole.OWNER])(
      "rejects an invitee offered %s",
      (role) => {
        const invitee = narrowPlayer(
          fields({
            status: PlayerStatus.INVITED,
            email: "alice@example.com",
            role,
          }),
        );

        expect(isTeamMember(invitee)).toBe(false);
      },
    );

    it("rejects an unlinked player", () => {
      expect(isTeamMember(narrowPlayer(fields()))).toBe(false);
    });
  });

  describe("hasTeamRole", () => {
    const table: [PlayerRole, PlayerRole, boolean][] = [
      [PlayerRole.OWNER, PlayerRole.OWNER, true],
      [PlayerRole.OWNER, PlayerRole.ADMIN, true],
      [PlayerRole.OWNER, PlayerRole.MEMBER, true],
      [PlayerRole.ADMIN, PlayerRole.OWNER, false],
      [PlayerRole.ADMIN, PlayerRole.ADMIN, true],
      [PlayerRole.ADMIN, PlayerRole.MEMBER, true],
      [PlayerRole.MEMBER, PlayerRole.OWNER, false],
      [PlayerRole.MEMBER, PlayerRole.ADMIN, false],
      [PlayerRole.MEMBER, PlayerRole.MEMBER, true],
    ];

    it.each(table)("%s meeting %s is %s", (role, required, expected) => {
      expect(hasTeamRole(member(role), required)).toBe(expected);
    });
  });

  describe("canManageTeam", () => {
    it.each([
      [PlayerRole.OWNER, true],
      [PlayerRole.ADMIN, true],
      [PlayerRole.MEMBER, false],
    ] as const)("%s can manage: %s", (role, expected) => {
      expect(canManageTeam(member(role))).toBe(expected);
    });
  });

  describe("isOwner", () => {
    it.each([
      [PlayerRole.OWNER, true],
      [PlayerRole.ADMIN, false],
      [PlayerRole.MEMBER, false],
    ] as const)("%s is owner: %s", (role, expected) => {
      expect(isOwner(member(role))).toBe(expected);
    });
  });
});
