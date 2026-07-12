import { cva } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VerdictStatus = "pass" | "fail" | "partial";

const config: Record<VerdictStatus, { icon: string; label: string }> = {
  pass: { icon: "✅", label: "Pass" },
  fail: { icon: "❌", label: "Fail" },
  partial: { icon: "⚠️", label: "Partial" },
};

const verdictVariants = cva("gap-1", {
  variants: {
    status: {
      pass: "bg-primary/10 text-primary dark:bg-primary/20",
      fail: "bg-destructive/10 text-destructive dark:bg-destructive/20",
      partial: "bg-warning/15 text-warning-foreground dark:text-warning",
    },
  },
});

export function Verdict({ status }: { status: VerdictStatus }) {
  const { icon, label } = config[status];
  return (
    <Badge
      variant="outline"
      data-testid="verdict-badge"
      data-status={status}
      className={cn(verdictVariants({ status }))}
    >
      <span aria-hidden="true">{icon}</span> {label}
    </Badge>
  );
}
