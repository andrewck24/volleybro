#!/usr/bin/env node
// Claude Code PreToolUse(Bash) hook. GitHub auto-merge notifies no agent, and a
// merge without --match-head-commit can land an unreviewed revision.
import { fileURLToPath } from "node:url";

const DENY =
  "gh pr merge needs --match-head-commit <reviewed-head> and no --auto. Run `pnpm pr:wait <number> --head <reviewed-head>` first, then merge as WORKFLOW.md section 5 (Merge, reconcile and clean up) says.";

// shortcut: splits on ; & | and newlines without parsing quotes, so a quoted
// mention of the command also trips it, and `gh api .../merge` is not covered;
// upgrade to a shell parser if either bites.
export function checkPrMerge(command) {
  for (const part of command.split(/[;&|\n]+/)) {
    if (!/\bgh\s+pr\s+merge\b/.test(part)) continue;
    const auto = /(^|\s)--auto(\s|=|$)/.test(part);
    const pinned = /(^|\s)--match-head-commit(\s+|=)[^\s-]/.test(part);
    if (auto || !pinned) return DENY;
  }
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.on("data", (c) => (input += c));
  process.stdin.on("end", () => {
    let command;
    try {
      command = JSON.parse(input).tool_input?.command ?? "";
    } catch {
      process.stderr.write("guard-pr-merge: stdin is not valid JSON; denying.");
      process.exit(2);
    }
    const reason = checkPrMerge(command);
    if (reason) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
          },
        }),
      );
    }
  });
}
