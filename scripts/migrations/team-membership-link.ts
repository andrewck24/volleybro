/**
 * Linking existing invitations to the accounts their email addresses belong to.
 *
 * Shared by the audit (read-only) and migrate scripts, and exercised by
 * test/integration/team-membership-link.itest.ts.
 *
 * This step runs only AFTER this Change is deployed to the environment, and
 * only once the post-deploy normalization audit is clean: linking an invitation
 * grants membership under the old permission checks, and a document the old
 * code wrote during the deploy gap does not fit the model. The normalization
 * audit is therefore the gate, re-run here on every invocation.
 *
 * Reports never contain email addresses.
 */
import type { mongo } from "mongoose";

import { auditNormalize, PLAYERS } from "./team-membership-normalize.js";

type Db = mongo.Db;

export const USERS = "users";

const INVITED = "INVITED";

type Raw = Record<string, unknown> & { _id: mongo.ObjectId };

export interface LinkSkip {
  id: string;
  code: string;
}

export interface LinkReport {
  /**
   * Stop codes from the normalization audit. Non-empty means nothing was
   * examined and nothing was written: normalize first, then link.
   */
  normalizeStops: string[];
  counts: {
    candidates: number;
    /** Linked, or in an audit the number that would be linked. */
    linked: number;
    unregistered: number;
    skipped: number;
  };
  skipped: LinkSkip[];
}

type Resolution =
  | { code: "link"; userId: mongo.ObjectId }
  | {
      code:
        | "emptyEmail"
        | "multipleAccounts"
        | "unregistered"
        | "userAlreadyOnTeam";
    };

/** A duplicate key message echoes the duplicated email, so only the code is kept. */
const errorCode = (error: unknown): string =>
  (error as { code?: unknown } | null)?.code === 11000
    ? "duplicateKey"
    : "writeFailed";

const resolve = async (db: Db, raw: Raw): Promise<Resolution> => {
  const address = typeof raw.email === "string" ? raw.email.trim() : "";
  if (!address) return { code: "emptyEmail" };

  // The same match the application makes: a collation compares the whole
  // address, where a case-insensitive $regex would let `.` match any character
  // and link the invitation to somebody else's account.
  const users = await db
    .collection(USERS)
    .find({ email: address })
    .collation({ locale: "en", strength: 2 })
    .limit(2)
    .toArray();

  if (users.length > 1) return { code: "multipleAccounts" };
  const user = users[0];
  if (!user) return { code: "unregistered" };

  const existing = await db
    .collection(PLAYERS)
    .findOne({ teamId: raw.teamId, userId: user._id });
  if (existing) return { code: "userAlreadyOnTeam" };

  return { code: "link", userId: user._id };
};

const link = async (db: Db, write: boolean): Promise<LinkReport> => {
  const normalize = await auditNormalize(db);
  const counts = { candidates: 0, linked: 0, unregistered: 0, skipped: 0 };
  if (normalize.stops.length > 0)
    return {
      normalizeStops: normalize.stops.map((stop) => stop.code),
      counts,
      skipped: [],
    };

  const raws = (await db
    .collection(PLAYERS)
    .find({
      status: INVITED,
      email: { $type: "string" },
      userId: { $exists: false },
    })
    .toArray()) as unknown as Raw[];
  counts.candidates = raws.length;
  const skipped: LinkSkip[] = [];

  // Per document, so one failure does not stop the rest.
  for (const raw of raws) {
    const id = String(raw._id);
    try {
      const resolution = await resolve(db, raw);
      if (resolution.code === "unregistered") {
        counts.unregistered += 1;
        continue;
      }
      if (resolution.code !== "link") {
        skipped.push({ id, code: resolution.code });
        counts.skipped += 1;
        continue;
      }
      if (!write) {
        counts.linked += 1;
        continue;
      }

      // The filter repeats what was read: an invitation cancelled or re-sent in
      // between no longer matches, and its new recipient keeps their address.
      const result = await db.collection(PLAYERS).updateOne(
        {
          _id: raw._id,
          status: INVITED,
          email: raw.email,
          userId: { $exists: false },
        },
        {
          $set: { userId: resolution.userId },
          $unset: { email: "" },
        },
      );
      if (result.matchedCount === 0) {
        skipped.push({ id, code: "changedSinceRead" });
        counts.skipped += 1;
      } else counts.linked += 1;
    } catch (error) {
      skipped.push({ id, code: errorCode(error) });
      counts.skipped += 1;
    }
  }

  return { normalizeStops: [], counts, skipped };
};

/** Read-only classification: reports what a run would link and what it would skip. */
export const auditLink = (db: Db): Promise<LinkReport> => link(db, false);

/**
 * Link the invitations. Idempotent: a linked invitation no longer holds an
 * email, so a second run finds no candidates.
 */
export const runLink = async (
  db: Db,
): Promise<{ applied: boolean; report: LinkReport }> => {
  const report = await link(db, true);
  return { applied: report.normalizeStops.length === 0, report };
};
