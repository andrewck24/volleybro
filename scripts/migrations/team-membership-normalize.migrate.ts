/**
 * Membership normalization. Idempotent: a second run changes nothing.
 *
 * Writes nothing when any stop condition holds — duplicates, owner counts that
 * are not one, shapes the model cannot express — so those are resolved by hand
 * before any document changes. It never adds a userId; linking invitations to
 * accounts happens after the deploy, in team-membership-link.migrate.ts.
 *
 * Run before deploying this Change, and again after each deploy.
 *
 * Usage: `node --env-file=.env.local --loader ts-node/esm scripts/migrations/team-membership-normalize.migrate.ts`
 */
import mongoose from "mongoose";

import { runNormalize } from "./team-membership-normalize.js";

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri);
  try {
    const { applied, report } = await runNormalize(mongoose.connection.db!);
    console.log(JSON.stringify(report, null, 2));
    if (!applied) {
      console.error(
        `\nStopped: ${report.stops.length} stop condition(s) hold. Nothing was written.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log("\nNormalization applied; indexes verified.");
  } finally {
    await mongoose.disconnect();
  }
};

await main();
