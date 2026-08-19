export const CHANGE_STATUSES = [
  "discussing",
  "in-progress",
  "archived",
] as const;

export type ChangeStatus = (typeof CHANGE_STATUSES)[number];

export const CHANGE_LIFECYCLES = [
  "discussing",
  "proposing",
  "ready-for-review",
  "ready-for-implementation",
  "applying",
  "ingesting",
  "pre-pr-review",
  "awaiting-delivery-review",
  "archived",
] as const;

export type ChangeLifecycle = (typeof CHANGE_LIFECYCLES)[number];

export type ChangeRecord = {
  schemaVersion: 1;
  slug: string;
  title: string;
  status: ChangeStatus;
  lifecycle: ChangeLifecycle;
  startedAt: string;
  archivedAt?: string;
  summary: string;
  capabilities: string[];
  tags: string[];
  href: string;
};

// The coarse status is not stored: a lifecycle determines it. Record makes the
// table exhaustive, so a new lifecycle value fails to compile until it is
// mapped rather than silently defaulting to a bucket.
const LIFECYCLE_STATUS: Record<ChangeLifecycle, ChangeStatus> = {
  discussing: "discussing",
  proposing: "in-progress",
  "ready-for-review": "in-progress",
  "ready-for-implementation": "in-progress",
  applying: "in-progress",
  ingesting: "in-progress",
  "pre-pr-review": "in-progress",
  "awaiting-delivery-review": "in-progress",
  archived: "archived",
};

export const statusOf = (lifecycle: ChangeLifecycle): ChangeStatus =>
  LIFECYCLE_STATUS[lifecycle];
