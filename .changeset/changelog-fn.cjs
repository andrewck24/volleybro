// Changelog formatter for @changesets/cli (referenced in config.json).
// Returns the changeset body verbatim; duplicate-heading merging and
// version header formatting are handled by changelog-postprocess.js.

/** @param {{ summary: string }} changeset */
async function getReleaseLine(changeset) {
  return changeset.summary.trim();
}

// Single-package repo — no workspace dependencies to track.
// When migrating to monorepo, implement this to list bumped dependencies.
async function getDependencyReleaseLine() {
  return "";
}

module.exports = { getReleaseLine, getDependencyReleaseLine };
