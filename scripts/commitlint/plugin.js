// The one local plugin commitlint allows per project (see decision 0055).
// It carries every mechanical rule config-conventional cannot express:
// the Blueprint-Change trailer, the AI-attribution ban, and the scope
// deny list for retired tool names.
import { currentBranch } from "./current-branch.js";
import { evaluateChangeBranchTrailer } from "./change-branch.js";
import { evaluateAiAttribution } from "./ai-attribution.js";

function blueprintChangeTrailer(parsed) {
  const verdict = evaluateChangeBranchTrailer(currentBranch(), parsed.raw);
  return verdict.ok ? [true] : [false, verdict.message];
}

function noAiAttribution(parsed) {
  const verdict = evaluateAiAttribution(parsed.raw);
  return verdict.ok ? [true] : [false, verdict.message];
}

function scopeDenyList(parsed, _when, deniedScopes = []) {
  const scope = (parsed.scope ?? "").toLowerCase();
  if (!scope) return [true];
  const denied = deniedScopes.find((name) => name.toLowerCase() === scope);
  return denied
    ? [
        false,
        `scope "${denied}" is a retired tool name and may not be used as a commit scope`,
      ]
    : [true];
}

const plugin = {
  rules: {
    "blueprint-change-trailer": blueprintChangeTrailer,
    "no-ai-attribution": noAiAttribution,
    "scope-deny-list": scopeDenyList,
  },
};

export default plugin;
