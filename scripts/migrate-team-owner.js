#!/usr/bin/env node
/*
 * Moves team ownership from a Player role to a Team attribute.
 *
 * Until now a team's owner was the one JOINED player with `role: "OWNER"`,
 * guarded by the unique partial index `teamId_1_owner_unique`. Ownership is now
 * `team.ownerPlayerId`, and the owner is an ordinary ADMIN player, so a
 * transfer becomes a single atomic write on the team document.
 *
 * Steps, in order:
 *
 *   a. audit    every team has exactly one JOINED OWNER player; any team that
 *               does not is listed and the script exits non-zero without writing
 *   b. backfill team.ownerPlayerId = that player's _id (skipped when equal)
 *   c. demote   that player's role OWNER -> ADMIN
 *   d. index    drop `teamId_1_owner_unique` on players if present
 *   e. verify   every team's ownerPlayerId is a JOINED ADMIN of the same team
 *               and no OWNER role remains
 *
 * The app that reads `role: "OWNER"` and the app that reads `ownerPlayerId`
 * cannot both be right about the same database, so each environment accepts a
 * brief window where the running app does not match its data: migrate, then
 * deploy straight away. Until the deploy lands, the old app sees no owner (no
 * transfer, and the owner could leave).
 *
 * Run order:
 *
 *   1. test database: dry-run, then --apply
 *   2. deploy to the environment that uses it, then --apply again: a team the
 *      old app created before the deploy landed has an OWNER and no
 *      ownerPlayerId, and the new app would see no owner for it
 *   3. production database: dry-run, then --apply
 *   4. deploy to production, then --apply again
 *
 * Idempotent: a finished database reports nothing to do. Once every environment
 * has run it, move it to docs/migrations and mark it SPENT, as
 * docs/migrations/migrate-legacy-accounts.js is.
 *
 *   node scripts/migrate-team-owner.js            # show the plan
 *   node scripts/migrate-team-owner.js --apply    # write
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const APPLY = process.argv.includes("--apply");
const OWNER_INDEX = "teamId_1_owner_unique";

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
const db = client.db();
const teams = db.collection("teams");
const players = db.collection("players");

async function finish(code) {
  await client.close();
  process.exit(code);
}

const teamDocs = await teams
  .find({}, { projection: { name: 1, ownerPlayerId: 1 } })
  .toArray();
const owners = await players
  .find({ role: "OWNER" }, { projection: { teamId: 1, status: 1 } })
  .toArray();

const ownersByTeam = new Map();
for (const p of owners) {
  const key = String(p.teamId);
  ownersByTeam.set(key, [...(ownersByTeam.get(key) ?? []), p]);
}

// (a) audit
const broken = [];
const plan = [];
for (const team of teamDocs) {
  const found = ownersByTeam.get(String(team._id)) ?? [];
  const joined = found.filter((p) => p.status === "JOINED");
  if (found.length === 1 && joined.length === 1) {
    plan.push({ team, owner: joined[0] });
  } else if (found.length === 0 && team.ownerPlayerId) {
    plan.push({ team, owner: null }); // already migrated
  } else {
    broken.push(
      `${team._id} "${team.name}": ${found.length} OWNER player(s), ${joined.length} JOINED`,
    );
  }
}

if (broken.length > 0) {
  console.error(`${broken.length} team(s) fail the audit; nothing written:`);
  for (const line of broken) console.error(`  ! ${line}`);
  await finish(1);
}

const backfill = plan.filter(
  ({ team, owner }) =>
    owner && String(team.ownerPlayerId) !== String(owner._id),
);
const demote = plan.filter(({ owner }) => owner);
const indexes = await players.indexes();
const hasIndex = indexes.some((i) => i.name === OWNER_INDEX);

console.log(`${teamDocs.length} team(s) pass the audit:`);
console.log(`  backfill ownerPlayerId  ${backfill.length}`);
console.log(`  demote OWNER -> ADMIN   ${demote.length}`);
console.log(`  drop ${OWNER_INDEX}  ${hasIndex ? "yes" : "already gone"}`);

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  await finish(0);
}

// (b) backfill
for (const { team, owner } of backfill) {
  await teams.updateOne(
    { _id: team._id },
    { $set: { ownerPlayerId: owner._id } },
  );
}
// (c) demote
for (const { owner } of demote) {
  // Only while still OWNER: if the old app moved ownership after the audit, the
  // verify step fails instead of this write masking it.
  await players.updateOne(
    { _id: owner._id, role: "OWNER" },
    { $set: { role: "ADMIN" } },
  );
}
// (d) index
if (hasIndex) await players.dropIndex(OWNER_INDEX);

// (e) verify
const failures = [];
for (const team of await teams.find({}).toArray()) {
  const owner = team.ownerPlayerId
    ? await players.findOne({ _id: team.ownerPlayerId })
    : null;
  if (
    !owner ||
    owner.status !== "JOINED" ||
    owner.role !== "ADMIN" ||
    String(owner.teamId) !== String(team._id)
  ) {
    failures.push(
      `${team._id} "${team.name}": ownerPlayerId is not a JOINED ADMIN of the team`,
    );
  }
}
const remaining = await players.countDocuments({ role: "OWNER" });
if (remaining > 0)
  failures.push(`${remaining} player(s) still hold role OWNER`);

if (failures.length > 0) {
  console.error("\nVerification failed:");
  for (const line of failures) console.error(`  ! ${line}`);
  await finish(1);
}
console.log(
  "\nApplied. Every team's owner is a JOINED ADMIN; no OWNER role remains.",
);
await finish(0);
