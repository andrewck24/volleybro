#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const APPLY = process.argv.includes("--apply");

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
