#!/usr/bin/env node
import { fileURLToPath } from "node:url";

const DENY =
  "gh pr merge needs --match-head-commit <reviewed-head> and no --auto. Run `pnpm pr:wait <number> --head <reviewed-head>` first, then merge as WORKFLOW.md section 5 (Merge, reconcile and clean up) says.";

function tokenize(command) {
  const commands = [[]];
  let token = "";
  let quote = null;
  let hasToken = false;
  const push = () => {
    if (hasToken) commands.at(-1).push(token);
    token = "";
    hasToken = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "\\" && quote !== "'") {
      if (command[i + 1] === "\n") {
        i++;
      } else {
        hasToken = true;
        if (i + 1 < command.length) token += command[++i];
      }
    } else if (quote) {
      if (c === quote) quote = null;
      else token += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      hasToken = true;
    } else if (/[;&|()\n]/.test(c)) {
      push();
      commands.push([]);
    } else if (/\s/.test(c)) {
      push();
    } else {
      token += c;
      hasToken = true;
    }
  }
  push();
  return commands;
}

function checkPrMerge(command) {
  for (const part of tokenize(command)) {
    let index = 0;
    while (
      ["then", "do", "else", "if", "while", "until", "{", "!"].includes(
        part[index],
      )
    )
      index++;
    while (/^[a-zA-Z_][a-zA-Z0-9_]*=/.test(part[index] ?? "")) index++;
    if (part[index] === "env" || part[index] === "command") {
      index++;
      if (part[index] === "--") index++;
      while (/^[a-zA-Z_][a-zA-Z0-9_]*=/.test(part[index] ?? "")) index++;
    }
    const tokens = part.slice(index);
    if (tokens[0] !== "gh") continue;
    if (tokens[1] === "pr" && tokens[2] === "merge") {
      const hasAuto = tokens.some(
        (t) => t === "--auto" || t.startsWith("--auto="),
      );
      const hasPinnedHead = tokens.some((t, i) =>
        t === "--match-head-commit"
          ? tokens[i + 1] && !tokens[i + 1].startsWith("-")
          : /^--match-head-commit=[^-].*/.test(t),
      );
      if (hasAuto || !hasPinnedHead) return DENY;
    }
    if (tokens[1] === "api") {
      let isMergeEndpoint = false;
      let isPut = false;
      let hasPinnedHead = false;
      for (let i = 2; i < tokens.length; i++) {
        const token = tokens[i];
        if (["--method", "-X"].includes(token)) {
          isPut = tokens[++i]?.toUpperCase() === "PUT";
        } else if (/^--method=/i.test(token)) {
          isPut = /^--method=PUT$/i.test(token);
        } else if (["-f", "-F", "--field", "--raw-field"].includes(token)) {
          const field = tokens[++i] ?? "";
          hasPinnedHead ||= /^sha=.+/.test(field);
        } else if (/^(?:--field|--raw-field)=/.test(token)) {
          hasPinnedHead ||= /^(?:--field|--raw-field)=sha=.+/.test(token);
        } else if (/^\/?repos\/[^/]+\/[^/]+\/pulls\/\d+\/merge$/.test(token)) {
          isMergeEndpoint = true;
        }
      }
      if (isMergeEndpoint && isPut && !hasPinnedHead)
        return "gh api pull request merges need a sha field containing the reviewed head. Run `pnpm pr:wait <number> --head <reviewed-head>` first.";
    }
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
