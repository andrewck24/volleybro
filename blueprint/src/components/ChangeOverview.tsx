import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ChangeLifecycle } from "@/lib/change-types";
import { cn } from "@/lib/utils";

type Artifact = { title: string; href: string };
type Status = "archived" | "in-progress" | "discussing" | "draft";
type Props = {
  date: string;
  status: Status;
  lifecycle?: ChangeLifecycle;
  summary: string;
  artifacts: Artifact[];
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

function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn(STATUS_CLASS[status])}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function ArtifactCard({ title, href }: Artifact) {
  return (
    <a href={href} className="block text-inherit no-underline">
      <Card className="flex-row items-center gap-2 border-l-4 border-l-primary px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50">
        {title}
        <span className="ml-auto text-xs text-muted-foreground">→</span>
      </Card>
    </a>
  );
}

export function ChangeOverview({
  date,
  status,
  lifecycle,
  summary,
  artifacts,
}: Props) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">{date}</span>
        <StatusBadge status={status} />
        {lifecycle && lifecycle !== status && (
          <Badge variant="secondary">{lifecycle}</Badge>
        )}
      </div>

      <p className="mt-0 mb-7 leading-relaxed">{summary}</p>

      <div className="flex flex-col gap-2">
        {artifacts.map((a) => (
          <ArtifactCard key={a.href} {...a} />
        ))}
      </div>
    </div>
  );
}
