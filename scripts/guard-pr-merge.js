#!/usr/bin/env node
import { fileURLToPath } from "node:url";

const DENY =
  "Use the plain pinned merge: `gh pr merge --merge --match-head-commit <reviewed-head>`. Run `pnpm pr:wait <number> --head <reviewed-head>` first.";

function checkPrMerge(command) {
  const intentText = command.toLowerCase().replace(/["'\\]/g, "");
  const hasMergeIntent =
    intentText.includes("gh") && intentText.includes("merge");
  const isCanonicalMerge =
    /^gh pr merge --merge --match-head-commit [a-fA-F0-9]+$/.test(command);
  return hasMergeIntent && !isCanonicalMerge ? DENY : null;
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
