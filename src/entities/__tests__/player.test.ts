import { AuthReason, PlayerReason, ValidationError } from "@/entities/errors";
import {
  canManageTeam,
  hasTeamRole,
  isTeamOwner,
  isTeamMember,
  type ManageRefusal,
  narrowPlayer,
  type PlayerFields,
  PlayerRole,
  PlayerStatus,
  refuseToManagePlayer,
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

  describe("isTeamOwner", () => {
    it.each([
      [PlayerRole.OWNER, true],
      [PlayerRole.ADMIN, false],
      [PlayerRole.MEMBER, false],
    ] as const)("%s is owner: %s", (role, expected) => {
      expect(isTeamOwner(member(role))).toBe(expected);
    });
  });

  describe("refuseToManagePlayer", () => {
    const memberAs = (role: PlayerRole, id: string, teamId = "team-1") =>
      narrowPlayer(
        fields({
          id,
          teamId,
          status: PlayerStatus.JOINED,
          userId: `user-${id}`,
          role,
        }),
      ) as TeamMember;

    const targets = {
      "the owner": memberAs(PlayerRole.OWNER, "target"),
      "an admin": memberAs(PlayerRole.ADMIN, "target"),
      "a member": memberAs(PlayerRole.MEMBER, "target"),
      "an invitee": narrowPlayer(
        fields({
          id: "target",
          status: PlayerStatus.INVITED,
          email: "invited@example.com",
          role: PlayerRole.ADMIN,
        }),
      ),
      "an unlinked player": narrowPlayer(fields({ id: "target" })),
    };

    type TargetKind = keyof typeof targets;

    const table: [PlayerRole, TargetKind, ManageRefusal | null][] = [
      [PlayerRole.OWNER, "the owner", PlayerReason.TARGET_IS_OWNER],
      [PlayerRole.OWNER, "an admin", null],
      [PlayerRole.OWNER, "a member", null],
      [PlayerRole.OWNER, "an invitee", null],
      [PlayerRole.OWNER, "an unlinked player", null],
      [PlayerRole.ADMIN, "the owner", PlayerReason.TARGET_IS_OWNER],
      [PlayerRole.ADMIN, "an admin", null],
      [PlayerRole.ADMIN, "a member", null],
      [PlayerRole.ADMIN, "an invitee", null],
      [PlayerRole.ADMIN, "an unlinked player", null],
      [PlayerRole.MEMBER, "the owner", AuthReason.INSUFFICIENT_ROLE],
      [PlayerRole.MEMBER, "an admin", AuthReason.INSUFFICIENT_ROLE],
      [PlayerRole.MEMBER, "a member", AuthReason.INSUFFICIENT_ROLE],
      [PlayerRole.MEMBER, "an invitee", AuthReason.INSUFFICIENT_ROLE],
      [PlayerRole.MEMBER, "an unlinked player", AuthReason.INSUFFICIENT_ROLE],
    ];

    it.each(table)("%s managing %s: %s", (role, target, expected) => {
      expect(
        refuseToManagePlayer(memberAs(role, "actor"), targets[target]),
      ).toBe(expected);
    });

    it.each([
      [PlayerRole.OWNER, PlayerReason.TARGET_IS_OWNER],
      [PlayerRole.ADMIN, PlayerReason.TARGET_IS_SELF],
      [PlayerRole.MEMBER, AuthReason.INSUFFICIENT_ROLE],
    ] as const)("%s targeting their own player: %s", (role, expected) => {
      const self = memberAs(role, "actor");

      expect(refuseToManagePlayer(self, self)).toBe(expected);
    });

    it("refuses an invitee as the caller", () => {
      const invitee = narrowPlayer(
        fields({
          id: "actor",
          status: PlayerStatus.INVITED,
          userId: "user-actor",
          role: PlayerRole.OWNER,
        }),
      );

      expect(refuseToManagePlayer(invitee, targets["a member"])).toBe(
        AuthReason.NOT_TEAM_MEMBER,
      );
    });

    it("refuses an unlinked player as the caller", () => {
      expect(
        refuseToManagePlayer(
          narrowPlayer(fields({ id: "actor" })),
          targets["a member"],
        ),
      ).toBe(AuthReason.NOT_TEAM_MEMBER);
    });

    it("refuses a caller with no player on the team", () => {
      expect(refuseToManagePlayer(null, targets["a member"])).toBe(
        AuthReason.NOT_TEAM_MEMBER,
      );
    });

    it("refuses an owner of another team", () => {
      expect(
        refuseToManagePlayer(
          memberAs(PlayerRole.OWNER, "actor", "team-2"),
          targets["a member"],
        ),
      ).toBe(AuthReason.NOT_TEAM_MEMBER);
    });
  });
});
