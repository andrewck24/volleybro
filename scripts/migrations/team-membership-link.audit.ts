/**
 * Audit (dry-run) for linking invitations to registered accounts. Writes nothing.
 *
 * Reports how many invitations would be linked, how many hold an address no
 * account has yet, and which ones are skipped and why. Emails are never printed.
 *
 * Runs only after this Change is deployed to this environment and the
 * normalization audit is clean; it refuses while that audit reports stops or an
 * index that is not the expected partial unique one.
 *
 * Usage: `node --env-file=.env.local --loader ts-node/esm scripts/migrations/team-membership-link.audit.ts`
 */
import mongoose from "mongoose";

import { auditLink } from "./team-membership-link.js";

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri);
  try {
    const report = await auditLink(mongoose.connection.db!);
    console.log(JSON.stringify(report, null, 2));
    if (report.normalizeStops.length > 0 || report.indexIssues.length > 0) {
      console.error(
        `\nNormalization is not clean (${report.normalizeStops.length} stop condition(s), ${report.indexIssues.length} index issue(s)); re-run the normalize audit and migrate first.`,
      );
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
};

await main();
