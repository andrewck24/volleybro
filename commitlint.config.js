import localPlugin from "./scripts/commitlint/plugin.js";

// Retired tool names that must never be used as a commit scope (see decision
// 0055 and CONTRIBUTING.md's Conventional Commits section for how the list
// was chosen): spectra and openspec are VolleyBro's own retired
// spec-management tools (see the archived `docs/changes/archive/` and
// `openspec/changes/archive/` ESLint ignores, and check-workflow.js's
// legacy `sdd` adapters); spec-kit and bmad are the frameworks OpenSpec
// itself replaced.
const RETIRED_TOOL_SCOPES = ["spectra", "openspec", "spec-kit", "bmad"];

const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
  plugins: [localPlugin],
  rules: {
    "body-empty": [2, "never"],
    "scope-deny-list": [2, "always", RETIRED_TOOL_SCOPES],
    "blueprint-change-trailer": [2, "always"],
    "no-ai-attribution": [2, "always"],
  },
};

export default commitlintConfig;
