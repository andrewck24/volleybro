import { parseTrailers, getTrailer } from "./trailers.js";

// See decision 0057: only feat/fix/refactor branches are Change branches;
// the Fix path moved to hotfix/<slug> so it never collides with this.
const CHANGE_BRANCH = /^(?:feat|fix|refactor)\/(.+)$/;

/**
 * Pure verdict: does `message` carry the Blueprint-Change trailer that
 * `branchName` requires? No git access — branch name and message in,
 * verdict out, so this is unit-testable without a repo.
 * @param {string} branchName current/head branch name, or "" when unknown
 *   (e.g. detached HEAD)
 * @param {string} message raw commit message
 * @returns {{ ok: true } | { ok: false, reason: "missing" | "mismatch", message: string }}
 */
export function evaluateChangeBranchTrailer(branchName, message) {
  if (!branchName) return { ok: true }; // detached HEAD (e.g. rebase reword): skip silently

  const match = branchName.match(CHANGE_BRANCH);
  if (!match) return { ok: true }; // dev, hotfix/*, chore/*, docs/*, claude/*, ...

  const slug = match[1];
  const value = getTrailer(parseTrailers(message), "Blueprint-Change");

  if (value === undefined) {
    return {
      ok: false,
      reason: "missing",
      message: `branch "${branchName}" is a Change branch (slug "${slug}") and needs a "Blueprint-Change: ${slug}" trailer, but the commit has none. Fix-path work belongs on hotfix/${slug} instead, not ${branchName.split("/")[0]}/${slug}.`,
    };
  }
  if (value !== slug) {
    return {
      ok: false,
      reason: "mismatch",
      message: `branch "${branchName}" needs "Blueprint-Change: ${slug}", but the commit carries "Blueprint-Change: ${value}". Fix-path work belongs on hotfix/${slug} instead, not ${branchName.split("/")[0]}/${slug}.`,
    };
  }
  return { ok: true };
}
