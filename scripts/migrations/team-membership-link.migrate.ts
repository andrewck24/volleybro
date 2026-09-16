/**
 * Link invitations to registered accounts. Idempotent: a second run changes nothing.
 *
 * Runs only after this Change is deployed to this environment and the
 * normalization audit is clean — linking grants membership under the old
 * permission checks — and it refuses while that audit reports stops or an index
 * that is not the expected partial unique one.
 *
 * Each invitation is written on its own, under a filter that repeats what was
 * read, so one that changed in the meantime is skipped and listed rather than
 * handed to the wrong account.
 *
 * Usage: `node --env-file=.env.local --loader ts-node/esm scripts/migrations/team-membership-link.migrate.ts`
 */
import mongoose from "mongoose";

import { runLink } from "./team-membership-link.js";

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri);
  try {
    const { applied, report } = await runLink(mongoose.connection.db!);
    console.log(JSON.stringify(report, null, 2));
    if (!applied) {
      console.error(
        `\nStopped: normalization reports ${report.normalizeStops.length} stop condition(s) and ${report.indexIssues.length} index issue(s). Nothing was written.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `\nLinked ${report.counts.linked} invitation(s); ${report.counts.skipped} skipped.`,
    );
    if (report.skipped.length > 0) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await main();
