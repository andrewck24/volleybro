import { Badge } from "@/components/ui/badge";
import {
  type ChangeLifecycle,
  type ChangeStatus,
  statusOf,
} from "@/lib/change-types";
import { cn } from "@/lib/utils";

// The label is the lifecycle, which is what a Change actually stores; the
// colour follows the coarse status it derives, so the three browse buckets stay
// visually distinct without the label losing precision.
const STATUS_CLASS: Record<ChangeStatus, string> = {
  archived:
    "bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] text-[var(--primary)] border border-[color-mix(in_oklch,var(--primary)_35%,transparent)]",
  "in-progress":
    "bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] text-[var(--warning)] border border-[color-mix(in_oklch,var(--warning)_40%,transparent)]",
  discussing:
    "border border-dashed border-[var(--border)] bg-transparent text-[var(--color-fd-muted-foreground)]",
};

export function LifecycleBadge({
  lifecycle,
  className,
}: {
  lifecycle: ChangeLifecycle;
  className?: string;
}) {
  const status = statusOf(lifecycle);

  return (
    <Badge
      variant="outline"
      data-status={status}
      data-lifecycle={lifecycle}
      className={cn(STATUS_CLASS[status], className)}
    >
      {lifecycle}
    </Badge>
  );
}
