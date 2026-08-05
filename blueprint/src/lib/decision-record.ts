const DECISION_STATUSES = [
  "candidate",
  "accepted",
  "implemented",
  "superseded",
] as const;
const ID_PATTERN = /^D[0-9]+$/;
const TARGET_PATTERN = /^[a-z0-9-]+(?:\/[a-z0-9-]+)+$/;
const CHANGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_KEYS = new Set([
  "$schema",
  "schemaVersion",
  "id",
  "title",
  "status",
  "targets",
  "context",
  "decision",
  "alternatives",
  "consequences",
  "revisitTriggers",
  "originChange",
]);
const ALTERNATIVE_KEYS = new Set(["option", "reason"]);

export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export type DecisionRecord = {
  schemaVersion: 1;
  id: string;
  title: string;
  status: DecisionStatus;
  targets: string[];
  context: string;
  decision: string;
  alternatives: Array<{ option: string; reason: string }>;
  consequences: string[];
  revisitTriggers: string[];
  originChange?: string;
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

export function parseDecisionRecord(value: unknown): DecisionRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Decision record must contain an object");
  }

  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some((key) => !ALLOWED_KEYS.has(key)) ||
    (record.$schema !== undefined && typeof record.$schema !== "string") ||
    record.schemaVersion !== 1 ||
    !isNonEmptyString(record.id) ||
    !ID_PATTERN.test(record.id) ||
    !isNonEmptyString(record.title) ||
    !DECISION_STATUSES.includes(record.status as DecisionStatus) ||
    !isStringArray(record.targets, {
      nonEmpty: true,
      pattern: TARGET_PATTERN,
      unique: true,
    }) ||
    !isNonEmptyString(record.context) ||
    !isNonEmptyString(record.decision) ||
    !Array.isArray(record.alternatives) ||
    !record.alternatives.every(isAlternative) ||
    !isStringArray(record.consequences, { nonEmpty: true }) ||
    !isStringArray(record.revisitTriggers, { nonEmpty: true }) ||
    (record.originChange !== undefined &&
      (!isNonEmptyString(record.originChange) ||
        !CHANGE_SLUG_PATTERN.test(record.originChange)))
  ) {
    throw new Error(
      `Invalid decision record: ${String(record.id ?? "unknown")}`,
    );
  }

  return record as DecisionRecord;
}
