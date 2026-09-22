import localPlugin from "./scripts/commitlint/plugin.js";

// Retired tool names (ADR-0055): spectra and openspec are this repo's own
// retired spec-management tools; spec-kit and bmad are what OpenSpec itself
// replaced.
const RETIRED_TOOL_SCOPES = ["spectra", "openspec", "spec-kit", "bmad"];

// Only a merge commit is exempt from every rule. commitlint's own
// defaultIgnores also exempts revert/fixup!/squash! commits, which would
// let a revert on a Change branch skip the trailer rule silently.
const MERGE_COMMIT = /^Merge (pull request|branch|remote-tracking branch) /;

const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
  plugins: [localPlugin],
  defaultIgnores: false,
  ignores: [(message) => MERGE_COMMIT.test(message)],
  rules: {
    "body-empty": [2, "never"],
    "scope-deny-list": [2, "always", RETIRED_TOOL_SCOPES],
    "blueprint-change-trailer": [2, "always"],
    "no-ai-attribution": [2, "always"],
  },
};

export default commitlintConfig;
