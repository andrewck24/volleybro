import { cva } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PRWriteupProps {
  number: number;
  title: string;
  status: "open" | "merged" | "closed";
}

const statusVariants = cva("tracking-wide uppercase", {
  variants: {
    status: {
      open: "bg-primary/10 text-primary dark:bg-primary/20",
      merged: "bg-secondary text-secondary-foreground",
      closed: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    },
  },
});

// stub: Thariq #17 PR-writeup 的薄版；需要敘事式 PR 文件時再 enrich
export function PRWriteup({ number, title, status }: PRWriteupProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">
          #{number}
        </span>
        <span className="flex-1 font-medium">{title}</span>
        <Badge
          variant="outline"
          data-status={status}
          className={cn(statusVariants({ status }))}
        >
          {status}
        </Badge>
      </CardContent>
    </Card>
  );
}
