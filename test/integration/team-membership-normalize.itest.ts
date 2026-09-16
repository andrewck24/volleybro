import mongoose from "mongoose";

import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

import {
  auditNormalize,
  PLAYERS,
  runNormalize,
  TEAMS,
} from "../../scripts/migrations/team-membership-normalize";

const db = () => mongoose.connection.db!;
const oid = () => new mongoose.Types.ObjectId();

const seedTeam = async (ownerUserId = oid()) => {
  const teamId = oid();
  await db().collection(TEAMS).insertOne({ _id: teamId, name: "Team" });
  await db().collection(PLAYERS).insertOne({
    teamId,
    name: "Owner",
    status: "JOINED",
    userId: ownerUserId,
    role: "OWNER",
  });
  return teamId;
};

const players = async (filter: Record<string, unknown> = {}) =>
  db().collection(PLAYERS).find(filter).toArray();

const codes = (report: Awaited<ReturnType<typeof auditNormalize>>) =>
  report.stops.map((stop) => stop.code);

describe("membership normalization", () => {
  // The shared setup only clears collections Mongoose models registered; these
  // are written through the driver, so they are cleared here.
  afterEach(async () => {
    await db().collection(PLAYERS).dropIndexes();
    await db().collection(PLAYERS).deleteMany({});
    await db().collection(TEAMS).deleteMany({});
  });

  it("turns a legacy document with a userId into a member and drops its email", async () => {
    const teamId = await seedTeam();
    const userId = oid();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Legacy",
      userId,
      email: "legacy@x.com",
      role: "MEMBER",
    });

    const { applied } = await runNormalize(db());
    expect(applied).toBe(true);

    const [player] = await players({ userId });
    expect(player).toMatchObject({ status: "JOINED", role: "MEMBER" });
    expect(player!.email).toBeUndefined();
  });

  it("turns a legacy email-only document into an unlinked player without a role", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Left or invited",
      email: "old@x.com",
      role: "ADMIN",
    });

    const audit = await auditNormalize(db());
    expect(audit.withdrawn).toHaveLength(1);
    expect(audit.withdrawn[0]).toMatchObject({ role: "ADMIN" });

    await runNormalize(db());

    const [player] = await players({ name: "Left or invited" });
    expect(player).toMatchObject({ status: "NONE" });
    expect(player!.role).toBeUndefined();
    expect(player!.email).toBeUndefined();
  });

  it("keeps a genuine pending invitation out of the withdrawn listing", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Pending invite",
      status: "INVITED",
      email: "invited@x.com",
      role: "MEMBER",
    });

    const audit = await auditNormalize(db());
    expect(audit.withdrawn).toHaveLength(0);
  });

  it("clears a role, an email and empty values from an unlinked player", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Unlinked",
      status: "NONE",
      role: "MEMBER",
      email: "pure@x.com",
      userId: null,
    });

    await runNormalize(db());

    const [player] = await players({ name: "Unlinked" });
    expect(player).toMatchObject({ status: "NONE" });
    expect(player!.role).toBeUndefined();
    expect(player!.email).toBeUndefined();
    expect("userId" in player!).toBe(false);
  });

  it("stops without writing when a member has no userId", async () => {
    const teamId = await seedTeam();
    await db()
      .collection(PLAYERS)
      .insertOne({ teamId, name: "Broken", status: "JOINED", role: "MEMBER" });
    await db()
      .collection(PLAYERS)
      .insertOne({ teamId, name: "Unlinked", status: "NONE", role: "MEMBER" });

    const { applied, report } = await runNormalize(db());

    expect(applied).toBe(false);
    expect(codes(report)).toContain("memberWithoutUserId");
    const [unlinked] = await players({ name: "Unlinked" });
    expect(unlinked!.role).toBe("MEMBER");
  });

  it("stops when an unlinked player carries a userId", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Half linked",
      status: "NONE",
      userId: oid(),
    });

    const { applied, report } = await runNormalize(db());

    expect(applied).toBe(false);
    expect(codes(report)).toContain("unlinkedPlayerWithUserId");
  });

  it("stops when the same user holds two players in one team", async () => {
    const teamId = await seedTeam();
    const userId = oid();
    await db()
      .collection(PLAYERS)
      .insertMany([
        { teamId, name: "A", status: "JOINED", userId, role: "MEMBER" },
        { teamId, name: "B", status: "INVITED", userId, role: "MEMBER" },
      ]);

    const { applied, report } = await runNormalize(db());

    expect(applied).toBe(false);
    expect(codes(report)).toContain("duplicateUser");
  });

  it("stops when a team has no owner", async () => {
    const teamId = oid();
    await db().collection(TEAMS).insertOne({ _id: teamId, name: "Ownerless" });
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Member",
      status: "JOINED",
      userId: oid(),
      role: "MEMBER",
    });

    const { applied, report } = await runNormalize(db());

    expect(applied).toBe(false);
    expect(
      codes(report).some((code) => code.startsWith("ownerCountNotOne")),
    ).toBe(true);
  });

  it("does not stop on a team with no players, and lists it", async () => {
    const teamId = oid();
    await db().collection(TEAMS).insertOne({ _id: teamId, name: "Empty team" });

    const { applied, report } = await runNormalize(db());

    expect(applied).toBe(true);
    expect(
      codes(report).some((code) => code.startsWith("ownerCountNotOne")),
    ).toBe(false);
    expect(report.teamsWithNoPlayers).toContainEqual({
      id: teamId.toString(),
      name: "Empty team",
    });
  });

  it("stops when an invitation holds an owner role", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Invited owner",
      status: "INVITED",
      email: "o@x.com",
      role: "OWNER",
    });

    const { applied, report } = await runNormalize(db());

    expect(applied).toBe(false);
    expect(codes(report)).toContain("nonMemberWithOwnerRole");
  });

  it("never writes a userId", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Invitee",
      status: "INVITED",
      email: "invitee@x.com",
      role: "MEMBER",
    });

    await runNormalize(db());

    const [invitee] = await players({ name: "Invitee" });
    expect("userId" in invitee!).toBe(false);
    expect(invitee!.email).toBe("invitee@x.com");
  });

  it("lowercases a mixed-case invitation email and leaves it untouched on a second run", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Invitee",
      status: "INVITED",
      email: "Invitee@X.com",
      role: "MEMBER",
    });

    await runNormalize(db());

    const [afterFirst] = await players({ name: "Invitee" });
    expect(afterFirst!.email).toBe("invitee@x.com");

    await runNormalize(db());

    const [afterSecond] = await players({ name: "Invitee" });
    expect(afterSecond!.email).toBe("invitee@x.com");
  });

  it("trims an invitation email that is already lowercase", async () => {
    const teamId = await seedTeam();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Invitee",
      status: "INVITED",
      email: " invitee@x.com ",
      role: "MEMBER",
    });

    await runNormalize(db());

    const [afterFirst] = await players({ name: "Invitee" });
    expect(afterFirst!.email).toBe("invitee@x.com");

    await runNormalize(db());

    const [afterSecond] = await players({ name: "Invitee" });
    expect(afterSecond!.email).toBe("invitee@x.com");
  });

  it("is idempotent and leaves partial unique indexes behind", async () => {
    const teamId = await seedTeam();
    await db()
      .collection(PLAYERS)
      .insertOne({ teamId, name: "Unlinked", role: "MEMBER" });

    const first = await runNormalize(db());
    const after = await players();
    const second = await runNormalize(db());

    expect(second.applied).toBe(true);
    expect(await players()).toEqual(after);

    const indexes = await db().collection(PLAYERS).indexes();
    const unique = indexes.filter((index) => index.unique);
    expect(unique.map((index) => index.name).sort()).toEqual([
      "teamId_1_email_1",
      "teamId_1_userId_1",
    ]);
    expect(first.report.indexes).toEqual(
      expect.arrayContaining(["teamId_1_userId_1"]),
    );
  });

  it("replaces a non-unique index that already holds the expected name", async () => {
    await seedTeam();
    await db()
      .collection(PLAYERS)
      .createIndex({ teamId: 1, userId: 1 }, { name: "teamId_1_userId_1" });

    await runNormalize(db());

    const index = (await db().collection(PLAYERS).indexes()).find(
      (candidate) => candidate.name === "teamId_1_userId_1",
    );
    expect(index).toMatchObject({
      unique: true,
      partialFilterExpression: { userId: { $type: "objectId" } },
    });
  });

  it("reports an index recreated without unique, and fixes nothing", async () => {
    await seedTeam();
    await runNormalize(db());
    await db().collection(PLAYERS).dropIndex("teamId_1_userId_1");
    await db()
      .collection(PLAYERS)
      .createIndex({ teamId: 1, userId: 1 }, { name: "teamId_1_userId_1" });

    const report = await auditNormalize(db());

    expect(report.indexIssues).toEqual(["indexNotUnique:teamId_1_userId_1"]);
    expect(report.indexes).toContain("teamId_1_email_1");
    const index = (await db().collection(PLAYERS).indexes()).find(
      (candidate) => candidate.name === "teamId_1_userId_1",
    );
    expect(index!.unique).toBeUndefined();
  });

  it("enforces one player per user per team once the index exists", async () => {
    const teamId = await seedTeam();
    await runNormalize(db());

    const userId = oid();
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "First",
      status: "JOINED",
      userId,
      role: "MEMBER",
    });

    await expect(
      db().collection(PLAYERS).insertOne({
        teamId,
        name: "Second",
        status: "JOINED",
        userId,
        role: "MEMBER",
      }),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("reports documents written by the old code after a normalize, so the rerun is visible", async () => {
    const teamId = await seedTeam();
    await runNormalize(db());
    const repository = container.get<IPlayerRepository>(TYPES.PlayerRepository);

    // What the old create-player writes: an unlinked player carrying a role.
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Written during the gap",
      status: "NONE",
      role: "MEMBER",
    });

    const audit = await auditNormalize(db());
    expect(audit.counts.unlinkedCarryingRoleOrEmail).toBe(1);

    // The critical risk: the roster read fails while the bad document sits there.
    await expect(repository.findByTeamId(teamId.toString())).rejects.toThrow();

    await runNormalize(db());

    const [player] = await players({ name: "Written during the gap" });
    expect(player!.role).toBeUndefined();
    await expect(
      repository.findByTeamId(teamId.toString()),
    ).resolves.not.toThrow();
  });

  describe("stop conditions", () => {
    it("stops on a duplicate email, comparing the normalized projection", async () => {
      const teamId = await seedTeam();
      await db()
        .collection(PLAYERS)
        .insertMany([
          {
            teamId,
            name: "A",
            status: "INVITED",
            email: "Dup@x.com",
            role: "MEMBER",
          },
          {
            teamId,
            name: "B",
            status: "INVITED",
            email: "dup@x.com",
            role: "MEMBER",
          },
        ]);

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("duplicateEmail");
    });

    it("stops when an invitation has no role", async () => {
      const teamId = await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId,
        name: "Invited",
        status: "INVITED",
        email: "invited@x.com",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("invitedWithoutRole");
    });

    it("stops when an invitation has both a userId and an email", async () => {
      const teamId = await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId,
        name: "Invited",
        status: "INVITED",
        userId: oid(),
        email: "invited@x.com",
        role: "MEMBER",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("invitedWithBothIds");
    });

    it("stops when an invitation has no recipient", async () => {
      const teamId = await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId,
        name: "Invited",
        status: "INVITED",
        role: "MEMBER",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("invitedWithoutRecipient");
    });

    it("stops when a member has no role", async () => {
      const teamId = await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId,
        name: "Member",
        status: "JOINED",
        userId: oid(),
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("memberWithoutRole");
    });

    it("stops on an unknown status", async () => {
      const teamId = await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId,
        name: "Weird",
        status: "LEFT",
        userId: oid(),
        role: "MEMBER",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("unknownStatus");
    });

    it("stops on a non-string status", async () => {
      const teamId = await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId,
        name: "Weird",
        status: 5,
        userId: oid(),
        role: "MEMBER",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("unknownStatus");
    });

    it("stops when teamId is missing or invalid", async () => {
      await seedTeam();
      await db().collection(PLAYERS).insertOne({
        name: "No team",
        status: "NONE",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("missingOrInvalidTeamId");
    });

    it("stops when teamId does not match an existing team", async () => {
      await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId: oid(),
        name: "Ghost team",
        status: "NONE",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("teamIdNotFound");
    });

    it("stops when userId is present but not an ObjectId", async () => {
      const teamId = await seedTeam();
      await db().collection(PLAYERS).insertOne({
        teamId,
        name: "Bad id",
        status: "JOINED",
        userId: "not-an-object-id",
        role: "MEMBER",
      });

      const { applied, report } = await runNormalize(db());

      expect(applied).toBe(false);
      expect(codes(report)).toContain("userIdNotObjectId");
    });
  });
});
