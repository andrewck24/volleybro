#!/usr/bin/env node
// Claude Code PreToolUse(Bash) hook. GitHub auto-merge notifies no agent, and a
// merge without --match-head-commit can land an unreviewed revision.
import { fileURLToPath } from "node:url";

// shortcut: regex over the raw command string, not a shell parse; a quoted
// mention of the command also trips it, which only costs a rephrase.
export function checkPrMerge(command) {
  if (!/\bgh\s+pr\s+merge\b/.test(command)) return null;
  const auto = /(^|\s)--auto(\s|=|$)/.test(command);
  const pinned = /(^|\s)--match-head-commit(\s+|=)[^\s-]/.test(command);
  if (!auto && pinned) return null;
  return "gh pr merge needs --match-head-commit <reviewed-head> and no --auto. Run `pnpm pr:wait <number> --head <reviewed-head>` first, then merge as WORKFLOW.md section 5 (Merge, reconcile and clean up) says.";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.on("data", (c) => (input += c));
  process.stdin.on("end", () => {
    const reason = checkPrMerge(JSON.parse(input)?.tool_input?.command ?? "");
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
