#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import {
  authorize,
  authorizeHotfix,
  authorizeRetry,
  validateOpenVersionPr,
} from "./release-controls/authorize.js";
import { fail } from "./release-controls/core.js";
import { finalize, prepareMergeBack } from "./release-controls/finalize.js";
import {
  classifySmoke,
  promote,
  recordProductionQA,
  recordSmokeAcceptance,
  summarizeSmoke,
} from "./release-controls/promote.js";
import {
  recordRecoveryEvidence,
  recoverVerify,
  rollbackIfCompatible,
} from "./release-controls/recovery.js";
import {
  checkPathClassification,
  planRecoveryCompatibility,
  recordSourceQA,
  stage,
} from "./release-controls/stage.js";

const actions = {
  authorize,
  "authorize-retry": authorizeRetry,
  "authorize-hotfix": authorizeHotfix,
  "validate-version-pr": validateOpenVersionPr,
  stage,
  "record-source-qa": recordSourceQA,
  "plan-recovery-compatibility": planRecoveryCompatibility,
  "check-path-classification": checkPathClassification,
  promote,
  "summarize-smoke": summarizeSmoke,
  "classify-smoke": classifySmoke,
  "record-smoke-acceptance": recordSmokeAcceptance,
  "rollback-if-compatible": rollbackIfCompatible,
  "record-recovery-evidence": recordRecoveryEvidence,
  "record-production-qa": recordProductionQA,
  "recover-verify": recoverVerify,
  finalize,
  "merge-back": prepareMergeBack,
};
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const action = actions[process.argv[2]];
    if (!action)
      fail(
        `Usage: node scripts/release-controls.js ${Object.keys(actions).join("|")}`,
      );
    await action();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
