import { cva } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SeverityBadgeProps = {
  level: "critical" | "warning" | "info" | "ok";
};

const severityVariants = cva("uppercase tracking-wide", {
  variants: {
    level: {
      critical: "bg-destructive/10 text-destructive dark:bg-destructive/20",
      warning: "bg-warning/15 text-warning-foreground dark:text-warning",
      info: "bg-secondary text-secondary-foreground",
      ok: "border-border bg-transparent text-muted-foreground",
    },
  },
});

export function SeverityBadge({ level }: SeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      data-testid="severity-badge"
      data-level={level}
      className={cn(severityVariants({ level }))}
    >
      {level}
    </Badge>
  );
}
