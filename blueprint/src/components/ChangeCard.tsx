import { cva } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Status = "archived" | "in-progress" | "draft";
type Props = {
  name: string;
  date?: string;
  status: Status;
  summary: string;
  href?: string;
};

const STATUS_LABEL: Record<Status, string> = {
  archived: "Archived",
  "in-progress": "In Progress",
  draft: "Draft",
};

const statusVariants = cva("", {
  variants: {
    status: {
      archived: "border-primary/35 bg-primary/10 text-primary",
      "in-progress": "border-warning/40 bg-warning/10 text-warning",
      draft: "border-border bg-muted text-muted-foreground",
    },
  },
});

export function ChangeCard({ name, date, status, summary, href }: Props) {
  const inner = (
    <Card className="gap-2 border-l-4 border-l-primary py-4">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm font-semibold text-foreground">{name}</code>
          <Badge
            variant="outline"
            data-status={status}
            className={cn(statusVariants({ status }))}
          >
            {STATUS_LABEL[status]}
          </Badge>
          {date && (
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {date}
            </span>
          )}
        </div>
        <p className="m-0 text-sm leading-snug text-muted-foreground">
          {summary}
        </p>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block text-inherit no-underline">
        {inner}
      </a>
    );
  }
  return inner;
}
