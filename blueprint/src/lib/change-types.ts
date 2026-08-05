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
