import { execFileSync } from "node:child_process";

/**
 * The branch the trailer rule should check against: COMMITLINT_BRANCH when
 * CI sets it (the pull request's head branch — `git branch --show-current`
 * would return CI's detached checkout instead), else the local branch.
 * Returns "" when neither is available, e.g. a detached HEAD locally.
 */
export function currentBranch() {
  if (process.env.COMMITLINT_BRANCH) return process.env.COMMITLINT_BRANCH;
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}
