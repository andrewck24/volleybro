import { cva } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Artifact = { title: string; href: string };
type Status = "archived" | "in-progress" | "draft";
type Props = {
  date: string;
  status: Status;
  summary: string;
  artifacts: Artifact[];
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

function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn(statusVariants({ status }))}
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

export function ChangeOverview({ date, status, summary, artifacts }: Props) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">{date}</span>
        <StatusBadge status={status} />
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
