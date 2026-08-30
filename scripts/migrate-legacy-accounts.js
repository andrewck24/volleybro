#!/usr/bin/env node
/*
 * Brings pre-Better-Auth account records onto the current schema.
 *
 * Better Auth 1.7's Mongo adapter creates a unique index over
 * (issuer, accountId) on the accounts collection, and it creates it lazily on
 * the first write rather than at install time. Records written by the previous
 * auth library carry `provider`/`providerAccountId` and neither of the indexed
 * fields, so every one of them presents the same key — (null, null) — and the
 * index can never build. The failure surfaces on the write that triggered the
 * build, and Better Auth reports it as `unable_to_link_account`, which is the
 * symptom rather than the cause: nobody can sign in, including users whose own
 * records are perfectly valid.
 *
 * A legacy record is converted rather than deleted, so the users behind those
 * records keep their sign-in. Only one is deleted: the case where the same user
 * already has a current record for the same Google identity, which is a
 * duplicate of something that already exists.
 *
 * Tokens are not carried across. They live under different names, every one of
 * them has long expired, and signing in issues new ones.
 *
 * Dry run by default. Pass --apply to write:
 *
 *   node scripts/migrate-legacy-accounts.js
 *   node scripts/migrate-legacy-accounts.js --apply
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const APPLY = process.argv.includes("--apply");

/** Reads MONGODB_URI from the environment, falling back to .env.local. */
function resolveUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith("MONGODB_URI="));
  if (!line)
    throw new Error(
      "MONGODB_URI is set neither in the environment nor in .env.local",
    );
  return line.slice("MONGODB_URI=".length).trim();
}

const client = new MongoClient(resolveUri());
await client.connect();
const accounts = client.db().collection("accounts");

const legacy = await accounts.find({ accountId: { $exists: false } }).toArray();
const current = await accounts.find({ accountId: { $exists: true } }).toArray();

if (legacy.length === 0) {
  console.log("No legacy records. Nothing to do.");
  await client.close();
  process.exit(0);
}

const takenAccountIds = new Set(current.map((doc) => doc.accountId));
const convert = [];
const remove = [];

for (const doc of legacy) {
  if (!doc.provider || !doc.providerAccountId) {
    // Neither shape: not safe to guess at, and not safe to delete either.
    console.error(
      `SKIP ${doc._id}: has neither accountId nor provider/providerAccountId`,
    );
    continue;
  }
  (takenAccountIds.has(doc.providerAccountId) ? remove : convert).push(doc);
  takenAccountIds.add(doc.providerAccountId);
}

console.log(`${legacy.length} legacy record(s):`);
console.log(`  convert ${convert.length}`);
console.log(
  `  delete  ${remove.length} (a current record already covers the same identity)`,
);
for (const doc of convert) {
  console.log(
    `  + ${doc._id} ${doc.provider}/${doc.providerAccountId} -> providerId/accountId`,
  );
}
for (const doc of remove) {
  console.log(
    `  - ${doc._id} ${doc.provider}/${doc.providerAccountId} duplicate`,
  );
}

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  await client.close();
  process.exit(0);
}

const now = new Date();
for (const doc of convert) {
  await accounts.updateOne(
    { _id: doc._id },
    {
      $set: {
        providerId: doc.provider,
        accountId: doc.providerAccountId,
        createdAt: doc.createdAt ?? now,
        updatedAt: now,
      },
      $unset: {
        provider: "",
        providerAccountId: "",
        type: "",
        access_token: "",
        id_token: "",
        expires_at: "",
        token_type: "",
        __v: "",
      },
    },
  );
}
if (remove.length > 0) {
  await accounts.deleteMany({ _id: { $in: remove.map((doc) => doc._id) } });
}

// The point of the exercise: no two records may present the same key, or the
// index Better Auth builds on its next write fails exactly as before.
const keys = await accounts
  .find({}, { projection: { issuer: 1, accountId: 1 } })
  .toArray();
const seen = new Map();
for (const doc of keys) {
  const key = `${doc.issuer ?? null}|${doc.accountId ?? null}`;
  seen.set(key, (seen.get(key) ?? 0) + 1);
}
const collisions = [...seen.entries()].filter(([, count]) => count > 1);

console.log(`\nApplied. ${keys.length} record(s) remain.`);
if (collisions.length > 0) {
  console.error("Duplicate (issuer, accountId) keys remain:", collisions);
  await client.close();
  process.exit(1);
}
console.log(
  "Every (issuer, accountId) key is distinct; the unique index can build.",
);

await client.close();
