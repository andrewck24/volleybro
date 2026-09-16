/**
 * Audit (dry-run) for the membership normalization. Writes nothing.
 *
 * Reports how many player documents fall into each category, which documents
 * hold a stop condition, which invitations lose their email, and which
 * documents carry an owner role without being a member. Emails are never
 * printed.
 *
 * Run it again after every deploy of this Change: the old code keeps writing
 * unlinked players that carry a role, and the new model rejects them.
 *
 * Usage: `node --env-file=.env.local --loader ts-node/esm scripts/migrations/team-membership-normalize.audit.ts`
 */
import mongoose from "mongoose";

import { auditNormalize } from "./team-membership-normalize.js";

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri);
  try {
    const report = await auditNormalize(mongoose.connection.db!);
    console.log(JSON.stringify(report, null, 2));
    if (report.stops.length > 0) {
      console.error(
        `\n${report.stops.length} stop condition(s) hold; normalization will not write anything.`,
      );
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
};

await main();
