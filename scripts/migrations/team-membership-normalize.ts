/**
 * Normalization of existing player documents for the membership model.
 *
 * Shared by the audit (read-only) and migrate scripts, and exercised by
 * test/integration/team-membership-normalize.itest.ts.
 *
 * Every player document must be one of three shapes: an unlinked player
 * (NONE, no userId/email/role), an invited player (INVITED, a role and exactly
 * one of userId/email) or a team member (JOINED, userId and role). This module
 * projects the current documents onto that model WITHOUT ever adding a userId:
 * linking an invitation to an account grants access under the old checks, so it
 * belongs to the separate post-deploy link step.
 *
 * Reports never contain email addresses.
 */
import type { mongo } from "mongoose";

/** The driver types bundled with Mongoose, so callers can pass connection.db. */
type Db = mongo.Db;

export const PLAYERS = "players";
export const TEAMS = "teams";

const STATUSES = ["NONE", "INVITED", "JOINED"] as const;
type Status = (typeof STATUSES)[number];

const OWNER = "OWNER";

type Raw = Record<string, unknown> & { _id: unknown };

export interface Listing {
  id: string;
  role: string | null;
  updatedAt: Date | null;
}

export interface Stop {
  code: string;
  docIds: string[];
}

export interface NormalizeReport {
  counts: {
    total: number;
    missingStatusWithUserId: number;
    missingStatusEmailOnly: number;
    missingStatusBare: number;
    unlinkedCarryingRoleOrEmail: number;
    memberCarryingEmail: number;
    emptyValuesCleared: number;
    alreadyConforming: number;
  };
  /** Invitations and unlinked players whose email is withdrawn by this step. */
  withdrawn: Listing[];
  /** Documents that carry an owner role without being a member, before normalization. */
  nonMemberOwners: Listing[];
  stops: Stop[];
  indexes?: string[];
}

interface Projection {
  id: string;
  raw: Raw;
  teamId: unknown;
  status: Status | null;
  hasUserId: boolean;
  email: string | null;
  role: string | null;
  set: Record<string, unknown>;
  unset: string[];
}

const isObjectId = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { toHexString?: unknown }).toHexString === "function";

const id = (value: unknown): string => String(value);

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizedEmail = (value: unknown): string => text(value).toLowerCase();

/** A key exists on the document but holds null, undefined or an empty string. */
const isEmptyValue = (raw: Raw, key: string): boolean =>
  key in raw &&
  (raw[key] === null || raw[key] === undefined || raw[key] === "");

const listing = (raw: Raw): Listing => ({
  id: id(raw._id),
  role: text(raw.role) || null,
  updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : null,
});

const project = (raw: Raw, counts: NormalizeReport["counts"]): Projection => {
  const hasUserId = isObjectId(raw.userId);
  const email = text(raw.email);
  const role = text(raw.role);
  const rawStatus = typeof raw.status === "string" ? raw.status : null;
  const set: Record<string, unknown> = {};
  const unset: string[] = [];

  let status: Status | null = null;
  if (rawStatus === null) {
    if (hasUserId) {
      status = "JOINED";
      set.status = status;
      counts.missingStatusWithUserId += 1;
    } else {
      status = "NONE";
      set.status = status;
      if (email) counts.missingStatusEmailOnly += 1;
      else counts.missingStatusBare += 1;
    }
  } else if ((STATUSES as readonly string[]).includes(rawStatus)) {
    status = rawStatus as Status;
  }

  if (status === "NONE") {
    if (role) unset.push("role");
    if (email) unset.push("email");
    if (rawStatus === "NONE" && (role || email))
      counts.unlinkedCarryingRoleOrEmail += 1;
  }
  if (status === "JOINED" && email) {
    unset.push("email");
    if (rawStatus === "JOINED") counts.memberCarryingEmail += 1;
  }

  for (const key of ["email", "role", "userId"]) {
    if (isEmptyValue(raw, key) && !unset.includes(key)) {
      unset.push(key);
      counts.emptyValuesCleared += 1;
    }
  }

  if (Object.keys(set).length === 0 && unset.length === 0)
    counts.alreadyConforming += 1;

  return {
    id: id(raw._id),
    raw,
    teamId: raw.teamId,
    status,
    hasUserId,
    email: status === "NONE" ? null : email || null,
    role: status === "NONE" ? null : role || null,
    set,
    unset,
  };
};

const collect = (stops: Map<string, string[]>, code: string, docId: string) => {
  const ids = stops.get(code) ?? [];
  ids.push(docId);
  stops.set(code, ids);
};

/**
 * Read-only classification. Stop conditions are evaluated against the projected
 * result rather than the current documents, because some duplicates only appear
 * once the projection is applied.
 */
export const auditNormalize = async (db: Db): Promise<NormalizeReport> => {
  const raws = (await db
    .collection(PLAYERS)
    .find({})
    .toArray()) as unknown as Raw[];
  const teamIds = new Set(
    (
      await db
        .collection(TEAMS)
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map((team) => id(team._id)),
  );

  const counts: NormalizeReport["counts"] = {
    total: raws.length,
    missingStatusWithUserId: 0,
    missingStatusEmailOnly: 0,
    missingStatusBare: 0,
    unlinkedCarryingRoleOrEmail: 0,
    memberCarryingEmail: 0,
    emptyValuesCleared: 0,
    alreadyConforming: 0,
  };
  const withdrawn: Listing[] = [];
  const nonMemberOwners: Listing[] = [];
  const stops = new Map<string, string[]>();

  const projections = raws.map((raw) => {
    if (text(raw.email) && !isObjectId(raw.userId))
      withdrawn.push(listing(raw));
    if (text(raw.role) === OWNER && raw.status !== "JOINED")
      nonMemberOwners.push(listing(raw));
    return project(raw, counts);
  });

  const byTeamUser = new Map<string, string[]>();
  const byTeamEmail = new Map<string, string[]>();
  const ownersByTeam = new Map<string, string[]>();

  for (const p of projections) {
    if (typeof p.raw.status === "string" && p.status === null)
      collect(stops, "unknownStatus", p.id);
    if (!isObjectId(p.teamId)) collect(stops, "missingOrInvalidTeamId", p.id);
    else if (!teamIds.has(id(p.teamId))) collect(stops, "teamIdNotFound", p.id);
    if ("userId" in p.raw && p.raw.userId !== null && !p.hasUserId)
      collect(stops, "userIdNotObjectId", p.id);

    if (p.status === "NONE" && p.hasUserId)
      collect(stops, "unlinkedPlayerWithUserId", p.id);
    if (p.status === "INVITED") {
      if (!p.role) collect(stops, "invitedWithoutRole", p.id);
      if (p.hasUserId && p.email) collect(stops, "invitedWithBothIds", p.id);
      if (!p.hasUserId && !p.email)
        collect(stops, "invitedWithoutRecipient", p.id);
      if (p.role === OWNER) collect(stops, "nonMemberWithOwnerRole", p.id);
    }
    if (p.status === "JOINED") {
      if (!p.hasUserId) collect(stops, "memberWithoutUserId", p.id);
      if (!p.role) collect(stops, "memberWithoutRole", p.id);
    }

    const team = isObjectId(p.teamId) ? id(p.teamId) : null;
    if (team && p.hasUserId) {
      const key = `${team}:${id(p.raw.userId)}`;
      byTeamUser.set(key, [...(byTeamUser.get(key) ?? []), p.id]);
    }
    if (team && p.status === "INVITED" && p.email) {
      const key = `${team}:${normalizedEmail(p.email)}`;
      byTeamEmail.set(key, [...(byTeamEmail.get(key) ?? []), p.id]);
    }
    if (team && p.status === "JOINED" && p.role === OWNER)
      ownersByTeam.set(team, [...(ownersByTeam.get(team) ?? []), p.id]);
  }

  for (const ids of byTeamUser.values())
    if (ids.length > 1) ids.forEach((d) => collect(stops, "duplicateUser", d));
  for (const ids of byTeamEmail.values())
    if (ids.length > 1) ids.forEach((d) => collect(stops, "duplicateEmail", d));

  // Owner count is checked per team, so a team with no players is covered too.
  for (const team of teamIds) {
    const owners = ownersByTeam.get(team) ?? [];
    if (owners.length !== 1)
      for (const docId of owners.length > 0 ? owners : [team])
        collect(stops, `ownerCountNotOne:${team}`, docId);
  }

  return {
    counts,
    withdrawn,
    nonMemberOwners,
    stops: [...stops.entries()].map(([code, docIds]) => ({ code, docIds })),
  };
};

const INDEXES = [
  {
    name: "teamId_1_email_1",
    key: { teamId: 1, email: 1 } as mongo.IndexSpecification,
    partialFilterExpression: { email: { $type: "string" } },
  },
  {
    name: "teamId_1_userId_1",
    key: { teamId: 1, userId: 1 } as mongo.IndexSpecification,
    partialFilterExpression: { userId: { $type: "objectId" } },
  },
];

/**
 * Replace the index declarations MongoDB never accepted (sparse together with a
 * partialFilterExpression, `$nin` inside the filter) with partial unique
 * indexes, keeping the default names so an old instance re-declaring them on
 * cold start cannot resurrect a non-unique one under a different name.
 */
export const ensureIndexes = async (db: Db): Promise<string[]> => {
  const players = db.collection(PLAYERS);
  for (const wanted of INDEXES) {
    const existing = (await players.indexes()).find(
      (index) => index.name === wanted.name,
    );
    const matches =
      existing?.unique === true &&
      JSON.stringify(existing.partialFilterExpression) ===
        JSON.stringify(wanted.partialFilterExpression);
    if (existing && !matches) await players.dropIndex(wanted.name);
    if (!matches)
      await players.createIndex(wanted.key, {
        name: wanted.name,
        unique: true,
        partialFilterExpression: wanted.partialFilterExpression,
      });
  }

  const after = await players.indexes();
  for (const wanted of INDEXES) {
    const index = after.find((candidate) => candidate.name === wanted.name);
    if (
      !index?.unique ||
      JSON.stringify(index.partialFilterExpression) !==
        JSON.stringify(wanted.partialFilterExpression)
    )
      throw new Error(
        `Index ${wanted.name} is not the expected partial unique index`,
      );
  }
  return after.map((index) => index.name ?? "");
};

/**
 * Apply the projection. Nothing is written when any stop condition holds, so a
 * run that reports stops leaves the database exactly as it was.
 */
export const runNormalize = async (
  db: Db,
): Promise<{ applied: boolean; report: NormalizeReport }> => {
  const report = await auditNormalize(db);
  if (report.stops.length > 0) return { applied: false, report };

  const raws = (await db
    .collection(PLAYERS)
    .find({})
    .toArray()) as unknown as Raw[];
  const counts = { ...report.counts };
  const writes = raws
    .map((raw) => project(raw, counts))
    .filter((p) => Object.keys(p.set).length > 0 || p.unset.length > 0)
    .map((p) => ({
      updateOne: {
        filter: { _id: p.raw._id },
        update: {
          ...(Object.keys(p.set).length > 0 ? { $set: p.set } : {}),
          ...(p.unset.length > 0
            ? { $unset: Object.fromEntries(p.unset.map((key) => [key, ""])) }
            : {}),
        },
      },
    }));

  if (writes.length > 0)
    await db
      .collection(PLAYERS)
      .bulkWrite(writes as never[], { ordered: false });

  return {
    applied: true,
    report: { ...report, indexes: await ensureIndexes(db) },
  };
};
