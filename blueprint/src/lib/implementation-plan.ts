import type { ImplementationSlice } from "@/components/ImplementationSlices";

const SLICE_ID_PATTERN = /^S\d{2,}$/;
const CAPABILITY_PATTERN = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;
const SLICE_STATUSES = ["pending", "completed", "superseded"] as const;
const PLAN_KEYS = new Set(["schemaVersion", "change", "slices"]);
const SLICE_KEYS = new Set([
  "$schema",
  "id",
  "title",
  "capabilities",
  "dependsOn",
  "outcome",
  "acceptanceCriteria",
  "verification",
  "status",
]);

function isStringArray(
  value: unknown,
  options: { nonEmpty?: boolean; pattern?: RegExp } = {},
): value is string[] {
  return (
    Array.isArray(value) &&
    (!options.nonEmpty || value.length > 0) &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.length > 0 &&
        (!options.pattern || options.pattern.test(item)),
    ) &&
    new Set(value).size === value.length
  );
}

function parseSlice(value: unknown, source: string): ImplementationSlice {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${source} must contain an object`);
  }

  const slice = value as Record<string, unknown>;
  const unknownKeys = Object.keys(slice).filter((key) => !SLICE_KEYS.has(key));

  if (
    unknownKeys.length > 0 ||
    (slice.$schema !== undefined && typeof slice.$schema !== "string") ||
    typeof slice.id !== "string" ||
    !SLICE_ID_PATTERN.test(slice.id) ||
    typeof slice.title !== "string" ||
    slice.title.length === 0 ||
    !isStringArray(slice.capabilities, {
      nonEmpty: true,
      pattern: CAPABILITY_PATTERN,
    }) ||
    !isStringArray(slice.dependsOn, { pattern: SLICE_ID_PATTERN }) ||
    typeof slice.outcome !== "string" ||
    slice.outcome.length === 0 ||
    !isStringArray(slice.acceptanceCriteria, { nonEmpty: true }) ||
    !isStringArray(slice.verification, { nonEmpty: true }) ||
    typeof slice.status !== "string" ||
    !SLICE_STATUSES.includes(slice.status as (typeof SLICE_STATUSES)[number])
  ) {
    throw new Error(
      `${source} does not satisfy the implementation slice contract`,
    );
  }

  return slice as ImplementationSlice;
}

export function resolveImplementationPlan(
  planValue: unknown,
  sliceEntries: Array<{ source: string; value: unknown }>,
  expectedChange: string,
): ImplementationSlice[] {
  if (
    typeof planValue !== "object" ||
    planValue === null ||
    Array.isArray(planValue)
  ) {
    throw new Error("implementation/plan.json must contain an object");
  }

  const plan = planValue as Record<string, unknown>;
  const unknownKeys = Object.keys(plan).filter((key) => !PLAN_KEYS.has(key));
  if (
    unknownKeys.length > 0 ||
    plan.schemaVersion !== 1 ||
    plan.change !== expectedChange ||
    !isStringArray(plan.slices, {
      nonEmpty: true,
      pattern: SLICE_ID_PATTERN,
    })
  ) {
    throw new Error(
      "implementation/plan.json does not satisfy the plan contract",
    );
  }

  const slices = sliceEntries.map(({ source, value }) =>
    parseSlice(value, source),
  );
  const byId = new Map(slices.map((slice) => [slice.id, slice]));

  if (
    byId.size !== slices.length ||
    slices.length !== plan.slices.length ||
    plan.slices.some((id) => !byId.has(id))
  ) {
    throw new Error(
      "implementation plan and slice files must contain the same unique IDs",
    );
  }

  const ordered = plan.slices.map((id) => byId.get(id)!);
  const position = new Map(ordered.map((slice, index) => [slice.id, index]));
  for (const slice of ordered) {
    const slicePosition = position.get(slice.id)!;
    if (
      slice.dependsOn.some(
        (dependency) =>
          !position.has(dependency) ||
          position.get(dependency)! >= slicePosition,
      )
    ) {
      throw new Error(
        `${slice.id} dependencies must exist and appear earlier in the plan`,
      );
    }
  }

  return ordered;
}
