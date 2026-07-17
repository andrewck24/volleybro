import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Status = "archived" | "in-progress" | "discussing" | "draft";
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
  discussing: "Discussing",
  draft: "Draft",
};

const STATUS_CLASS: Record<Status, string> = {
  archived:
    "bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] text-[var(--primary)] border border-[color-mix(in_oklch,var(--primary)_35%,transparent)]",
  "in-progress":
    "bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] text-[var(--warning)] border border-[color-mix(in_oklch,var(--warning)_40%,transparent)]",
  discussing:
    "border border-dashed border-[var(--border)] bg-transparent text-[var(--color-fd-muted-foreground)]",
  draft:
    "bg-[var(--color-fd-muted)] text-[var(--color-fd-muted-foreground)] border border-[var(--border)]",
};

export function ChangeCard({ name, date, status, summary, href }: Props) {
  const inner = (
    <Card className="gap-2 border-l-4 border-l-primary py-4">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm font-semibold text-foreground">{name}</code>
          <Badge
            variant="outline"
            data-status={status}
            className={cn(STATUS_CLASS[status])}
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
