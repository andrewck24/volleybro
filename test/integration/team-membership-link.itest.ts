import type { mongo } from "mongoose";
import mongoose from "mongoose";

import {
  auditLink,
  runLink,
  USERS,
} from "../../scripts/migrations/team-membership-link";
import {
  PLAYERS,
  TEAMS,
} from "../../scripts/migrations/team-membership-normalize";

const db = () => mongoose.connection.db!;
const oid = () => new mongoose.Types.ObjectId();

const seedTeam = async () => {
  const teamId = oid();
  await db().collection(TEAMS).insertOne({ _id: teamId, name: "Team" });
  await db().collection(PLAYERS).insertOne({
    teamId,
    name: "Owner",
    status: "JOINED",
    userId: oid(),
    role: "OWNER",
  });
  return teamId;
};

const seedUser = async (email: string) => {
  const userId = oid();
  await db().collection(USERS).insertOne({ _id: userId, name: email, email });
  return userId;
};

const seedInvitation = async (teamId: mongo.BSON.ObjectId, email: string) => {
  const { insertedId } = await db().collection(PLAYERS).insertOne({
    teamId,
    name: "Invitee",
    status: "INVITED",
    email,
    role: "MEMBER",
  });
  return insertedId;
};

const invitee = async () =>
  db().collection(PLAYERS).findOne({ name: "Invitee" });

/**
 * A database whose player `findOne` — the "already on this team?" lookup, which
 * runs between reading an invitation and writing it — lets the test act as the
 * admin who changed that invitation in between.
 */
const raceDb = (mutate: () => Promise<void>): mongo.Db =>
  new Proxy(db(), {
    get: (target, prop, receiver) => {
      if (prop !== "collection") return Reflect.get(target, prop, receiver);
      return (name: string) => {
        const collection = target.collection(name);
        if (name !== PLAYERS) return collection;
        return new Proxy(collection, {
          get: (source, key) => {
            if (key === "findOne")
              return async (
                ...args: Parameters<mongo.Collection["findOne"]>
              ) => {
                const found = await source.findOne(...args);
                await mutate();
                return found;
              };
            const value = Reflect.get(source, key, source);
            return typeof value === "function" ? value.bind(source) : value;
          },
        });
      };
    },
  });

describe("linking invitations to registered accounts", () => {
  // The shared setup only clears collections Mongoose models registered; these
  // are written through the driver, so they are cleared here.
  afterEach(async () => {
    await db().collection(PLAYERS).deleteMany({});
    await db().collection(TEAMS).deleteMany({});
    await db().collection(USERS).deleteMany({});
  });

  it("links an invitation to the account holding that address", async () => {
    const teamId = await seedTeam();
    const userId = await seedUser("alice@example.com");
    await seedInvitation(teamId, "alice@example.com");

    const { applied, report } = await runLink(db());

    expect(applied).toBe(true);
    expect(report.counts).toMatchObject({ candidates: 1, linked: 1 });
    const linked = await invitee();
    expect(linked!.userId).toEqual(userId);
    expect(linked!.email).toBeUndefined();
    expect(linked!.status).toBe("INVITED");
  });

  it("links an address that differs only in case", async () => {
    const teamId = await seedTeam();
    const userId = await seedUser("Bob@Example.com");
    await seedInvitation(teamId, "bob@example.com");

    await runLink(db());

    expect((await invitee())!.userId).toEqual(userId);
  });

  it("does not let a dot in the address reach another account", async () => {
    const teamId = await seedTeam();
    await seedUser("axb@x.com");
    await seedInvitation(teamId, "a.b@x.com");

    const { report } = await runLink(db());

    expect(report.counts).toMatchObject({ linked: 0, unregistered: 1 });
    const untouched = await invitee();
    expect(untouched!.email).toBe("a.b@x.com");
    expect("userId" in untouched!).toBe(false);
  });

  it("skips an address that two accounts hold", async () => {
    const teamId = await seedTeam();
    await seedUser("Twin@example.com");
    await seedUser("twin@example.com");
    await seedInvitation(teamId, "twin@example.com");

    const { report } = await runLink(db());

    expect(report.skipped).toEqual([
      { id: expect.any(String), code: "multipleAccounts" },
    ]);
    expect("userId" in (await invitee())!).toBe(false);
  });

  it("skips an account that already has a player on that team", async () => {
    const teamId = await seedTeam();
    const userId = await seedUser("carol@example.com");
    await db().collection(PLAYERS).insertOne({
      teamId,
      name: "Carol",
      status: "JOINED",
      userId,
      role: "MEMBER",
    });
    await seedInvitation(teamId, "carol@example.com");

    const { report } = await runLink(db());

    expect(report.skipped).toEqual([
      { id: expect.any(String), code: "userAlreadyOnTeam" },
    ]);
    expect("userId" in (await invitee())!).toBe(false);
  });

  it("skips an invitation cancelled after it was read", async () => {
    const teamId = await seedTeam();
    await seedUser("dave@example.com");
    const invitationId = await seedInvitation(teamId, "dave@example.com");

    const { report } = await runLink(
      raceDb(async () => {
        await db()
          .collection(PLAYERS)
          .updateOne(
            { _id: invitationId },
            { $set: { status: "NONE" }, $unset: { email: "", role: "" } },
          );
      }),
    );

    expect(report.skipped).toEqual([
      { id: invitationId.toString(), code: "changedSinceRead" },
    ]);
    const cancelled = await invitee();
    expect(cancelled!.status).toBe("NONE");
    expect("userId" in cancelled!).toBe(false);
  });

  it("skips an invitation re-sent to somebody else after it was read", async () => {
    const teamId = await seedTeam();
    await seedUser("dave@example.com");
    const invitationId = await seedInvitation(teamId, "dave@example.com");

    const { report } = await runLink(
      raceDb(async () => {
        await db()
          .collection(PLAYERS)
          .updateOne(
            { _id: invitationId },
            { $set: { email: "erin@example.com" } },
          );
      }),
    );

    expect(report.skipped).toEqual([
      { id: invitationId.toString(), code: "changedSinceRead" },
    ]);
    const resent = await invitee();
    expect(resent!.email).toBe("erin@example.com");
    expect("userId" in resent!).toBe(false);
  });

  it("refuses to run while the normalization audit reports stops", async () => {
    const teamId = await seedTeam();
    await seedUser("frank@example.com");
    await seedInvitation(teamId, "frank@example.com");
    // What the old code writes during the deploy gap.
    await db()
      .collection(PLAYERS)
      .insertOne({ teamId, name: "Gap", status: "NONE", userId: oid() });

    const audit = await auditLink(db());
    const { applied, report } = await runLink(db());

    expect(audit.normalizeStops).toContain("unlinkedPlayerWithUserId");
    expect(applied).toBe(false);
    expect(report.counts.candidates).toBe(0);
    expect("userId" in (await invitee())!).toBe(false);
  });

  it("changes nothing on a second run", async () => {
    const teamId = await seedTeam();
    await seedUser("grace@example.com");
    await seedInvitation(teamId, "grace@example.com");

    await runLink(db());
    const after = await db().collection(PLAYERS).find({}).toArray();
    const second = await runLink(db());

    expect(second.report.counts).toMatchObject({ candidates: 0, linked: 0 });
    expect(await db().collection(PLAYERS).find({}).toArray()).toEqual(after);
  });

  it("reports what it would link without writing anything", async () => {
    const teamId = await seedTeam();
    await seedUser("heidi@example.com");
    await seedInvitation(teamId, "heidi@example.com");

    const report = await auditLink(db());

    expect(report.counts).toMatchObject({ candidates: 1, linked: 1 });
    expect("userId" in (await invitee())!).toBe(false);
  });
});
