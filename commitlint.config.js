import localPlugin from "./scripts/commitlint/plugin.js";

// Retired tool names (ADR-0055): spectra and openspec are this repo's own
// retired spec-management tools; spec-kit and bmad are what OpenSpec itself
// replaced.
const RETIRED_TOOL_SCOPES = ["spectra", "openspec", "spec-kit", "bmad"];

// Revert/fixup!/squash! handling: see ADR-0055's consequences.
const MERGE_COMMIT = /^Merge (pull request|branch|remote-tracking branch) /;
const AUTOSQUASH_COMMIT = /^(fixup|squash)!/;

const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
  plugins: [localPlugin],
  defaultIgnores: false,
  ignores: [
    (message) => MERGE_COMMIT.test(message),
    (message) => !process.env.CI && AUTOSQUASH_COMMIT.test(message),
  ],
  rules: {
    "body-empty": [2, "never"],
    // scope-enum matches exact-case; lower-casing first stops a retired name slipping past in another case.
    "scope-case": [2, "always", "lower-case"],
    "scope-enum": [2, "never", RETIRED_TOOL_SCOPES],
    "blueprint-change-trailer": [2, "always"],
    "no-ai-attribution": [2, "always"],
  },
};

export default commitlintConfig;
