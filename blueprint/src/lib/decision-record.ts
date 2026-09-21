const ID_PATTERN = /^D[0-9]+$/;
const CAPABILITY_PATTERN = /^[a-z0-9-]+(?:\/[a-z0-9-]+)+$/;
const CHANGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_KEYS = new Set([
  "$schema",
  "schemaVersion",
  "id",
  "title",
  "capabilities",
  "decision",
  "context",
  "alternatives",
  "consequences",
  "revisitTriggers",
  "originChange",
  "supersededBy",
]);
// Version 1 named the capability list `targets` and carried the Proposal-page
// number a promoted record was renumbered from. Both are read only from
// records published inside Change pages on the store branch, which are history
// and are never rewritten.
const VERSION_1_KEYS = new Set([...ALLOWED_KEYS, "targets", "originDecision"]);
const ALTERNATIVE_KEYS = new Set(["option", "reason"]);

export type DecisionRecord = {
  schemaVersion: 2;
  id: string;
  title: string;
  capabilities: string[];
  decision: string;
  context?: string;
  alternatives?: Array<{ option: string; reason: string }>;
  consequences?: string[];
  revisitTriggers?: string[];
  originChange?: string;
  supersededBy?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(
  value: unknown,
  options: { nonEmpty?: boolean; pattern?: RegExp; unique?: boolean } = {},
): value is string[] {
  return (
    Array.isArray(value) &&
    (!options.nonEmpty || value.length > 0) &&
    value.every(
      (item) =>
        isNonEmptyString(item) &&
        (!options.pattern || options.pattern.test(item)),
    ) &&
    (!options.unique || new Set(value).size === value.length)
  );
}

function isAlternative(
  value: unknown,
): value is { option: string; reason: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const alternative = value as Record<string, unknown>;
  return (
    Object.keys(alternative).every((key) => ALTERNATIVE_KEYS.has(key)) &&
    Object.keys(alternative).length === ALTERNATIVE_KEYS.size &&
    isNonEmptyString(alternative.option) &&
    isNonEmptyString(alternative.reason)
  );
}

function isOptional(
  value: unknown,
  check: (value: unknown) => boolean,
): boolean {
  return value === undefined || check(value);
}

function isDecisionId(value: unknown): boolean {
  return isNonEmptyString(value) && ID_PATTERN.test(value);
}

export function parseDecisionRecord(value: unknown): DecisionRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Decision record must contain an object");
  }

  const record = value as Record<string, unknown>;
  const isVersion1 = record.schemaVersion === 1;
  const allowed = isVersion1 ? VERSION_1_KEYS : ALLOWED_KEYS;
  const capabilities = isVersion1 ? record.targets : record.capabilities;

  if (
    Object.keys(record).some((key) => !allowed.has(key)) ||
    (record.schemaVersion !== 2 && !isVersion1) ||
    (record.$schema !== undefined && typeof record.$schema !== "string") ||
    !isDecisionId(record.id) ||
    !isNonEmptyString(record.title) ||
    !isStringArray(capabilities, {
      nonEmpty: true,
      pattern: CAPABILITY_PATTERN,
      unique: true,
    }) ||
    !isNonEmptyString(record.decision) ||
    !isOptional(record.context, isNonEmptyString) ||
    !isOptional(
      record.alternatives,
      (alternatives) =>
        Array.isArray(alternatives) && alternatives.every(isAlternative),
    ) ||
    !isOptional(record.consequences, (consequences) =>
      isStringArray(consequences, { nonEmpty: true }),
    ) ||
    !isOptional(record.revisitTriggers, (triggers) =>
      isStringArray(triggers, { nonEmpty: true }),
    ) ||
    !isOptional(
      record.originChange,
      (origin) => isNonEmptyString(origin) && CHANGE_SLUG_PATTERN.test(origin),
    ) ||
    !isOptional(record.supersededBy, isDecisionId) ||
    (isVersion1 && !isOptional(record.originDecision, isDecisionId))
  ) {
    throw new Error(
      `Invalid decision record: ${String(record.id ?? "unknown")}`,
    );
  }

  if (!isVersion1) return record as DecisionRecord;

  const {
    targets: _targets,
    originDecision: _originDecision,
    ...rest
  } = record;
  return { ...rest, schemaVersion: 2, capabilities } as DecisionRecord;
}
