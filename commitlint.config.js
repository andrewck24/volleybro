import localPlugin from "./scripts/commitlint/plugin.js";

const RETIRED_TOOL_SCOPES = ["spectra", "openspec", "spec-kit", "bmad"];

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
    "scope-case": [2, "always", "lower-case"],
    "scope-enum": [2, "never", RETIRED_TOOL_SCOPES],
    "change-branch-trailer": [2, "always"],
    "no-ai-attribution": [2, "always"],
    "footer-lookalike": [2, "always"],
  },
};

export default commitlintConfig;
