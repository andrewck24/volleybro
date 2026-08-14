import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Status = "archived" | "in-progress" | "discussing" | "draft";
type Props = {
  name: string;
  date?: string;
  status: Status;
  lifecycle?: string;
  summary: string;
  href?: string;
  capabilities?: string[];
  tags?: string[];
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

export function ChangeCard({
  name,
  date,
  status,
  lifecycle,
  summary,
  href,
  capabilities = [],
  tags = [],
}: Props) {
  const visibleCapabilities = capabilities.slice(0, 2);
  const visibleTags = tags.slice(0, 3);
  const hiddenCount =
    capabilities.length +
    tags.length -
    visibleCapabilities.length -
    visibleTags.length;

  const inner = (
    <Card className="gap-3 border-l-4 border-l-primary py-4 transition-colors hover:bg-muted/30">
      <CardHeader className="gap-2 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-mono text-sm">{name}</CardTitle>
          <Badge
            variant="outline"
            data-status={status}
            className={cn(STATUS_CLASS[status])}
          >
            {STATUS_LABEL[status]}
          </Badge>
          {lifecycle && lifecycle !== status && (
            <Badge variant="secondary">{lifecycle}</Badge>
          )}
          {date && (
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {date}
            </span>
          )}
        </div>
        <CardDescription className="leading-snug">{summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5 px-4">
        {visibleCapabilities.map((capability) => (
          <Badge key={capability} variant="outline">
            {capability}
          </Badge>
        ))}
        {visibleTags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {hiddenCount > 0 && <Badge variant="secondary">+{hiddenCount}</Badge>}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block text-inherit !no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}
