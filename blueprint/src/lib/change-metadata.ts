import {
  CHANGE_LIFECYCLES,
  type ChangeLifecycle,
  type ChangeRecord,
  type ChangeStatus,
} from "@/lib/change-types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAPABILITY_PATTERN = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;
const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_KEYS = new Set([
  "schemaVersion",
  "slug",
  "title",
  "status",
  "lifecycle",
  "startedAt",
  "archivedAt",
  "summary",
  "capabilities",
  "tags",
]);

function isUniqueStringArray(
  value: unknown,
  pattern: RegExp,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && pattern.test(item)) &&
    new Set(value).size === value.length
  );
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function lifecycleMatchesStatus(
  lifecycle: ChangeLifecycle,
  status: ChangeStatus,
) {
  if (status === "discussing") return lifecycle === "discussing";
  if (status === "archived") return lifecycle === "archived";
  return lifecycle !== "discussing" && lifecycle !== "archived";
}

export function parseChangeMetadata(
  value: unknown,
  status: ChangeStatus,
  directoryName: string,
  directory: string,
): ChangeRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${directoryName}/change.json must contain an object`);
  }

  const record = value as Record<string, unknown>;
  const lifecycle = record.lifecycle as ChangeLifecycle;
  const unknownKeys = Object.keys(record).filter(
    (key) => !ALLOWED_KEYS.has(key),
  );
  const expectedDirectory =
    status === "archived" && typeof record.archivedAt === "string"
      ? `${record.archivedAt}-${record.slug}`
      : record.slug;

  if (
    unknownKeys.length > 0 ||
    record.schemaVersion !== 1 ||
    typeof record.slug !== "string" ||
    !SLUG_PATTERN.test(record.slug) ||
    expectedDirectory !== directoryName ||
    record.status !== status ||
    !CHANGE_LIFECYCLES.includes(lifecycle) ||
    !lifecycleMatchesStatus(lifecycle, status) ||
    typeof record.title !== "string" ||
    record.title.length === 0 ||
    !isDate(record.startedAt) ||
    (record.archivedAt !== undefined && !isDate(record.archivedAt)) ||
    (status === "archived" && !isDate(record.archivedAt)) ||
    typeof record.summary !== "string" ||
    record.summary.length === 0 ||
    !isUniqueStringArray(record.capabilities, CAPABILITY_PATTERN) ||
    !isUniqueStringArray(record.tags, TAG_PATTERN)
  ) {
    throw new Error(
      `${directoryName}/change.json does not satisfy the Change metadata contract`,
    );
  }

  return {
    schemaVersion: 1,
    slug: record.slug,
    title: record.title,
    status,
    lifecycle,
    startedAt: record.startedAt,
    archivedAt: record.archivedAt,
    summary: record.summary,
    capabilities: record.capabilities,
    tags: record.tags,
    href: `/changes/${directory}/${directoryName}/`,
  };
}
