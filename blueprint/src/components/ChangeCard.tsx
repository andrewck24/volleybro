import Link from "next/link";

import { FigureBadges } from "@/components/FigureBadges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChangeStatus, ChangeSummary } from "@/lib/changes-index";

const STATUS_CLASS: Record<ChangeStatus, string> = {
  archived:
    "border-[color-mix(in_oklch,var(--primary)_35%,transparent)] bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] text-primary",
  "in-progress":
    "border-[color-mix(in_oklch,var(--warning)_40%,transparent)] bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] text-warning",
  discussing: "border-dashed bg-transparent text-muted-foreground",
};

const VISIBLE_CAPABILITIES = 2;

export function ChangeCard({ change }: { change: ChangeSummary }) {
  const shown = change.capabilities.slice(0, VISIBLE_CAPABILITIES);
  const hidden = change.capabilities.length - shown.length;

  return (
    <Link href={change.href} className="block text-inherit no-underline!">
      <Card className="gap-3 border-l-4 border-l-primary py-4 transition-colors hover:bg-muted/30">
        <CardHeader className="gap-2 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{change.title}</CardTitle>
            <Badge
              variant="outline"
              className={STATUS_CLASS[change.state.status]}
            >
              {change.state.label}
            </Badge>
            {change.date && (
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {change.date.kind === "started" && "started "}
                {change.date.value.slice(0, 10)}
              </span>
            )}
          </div>
          {change.description && (
            <CardDescription className="leading-snug">
              {change.description}
            </CardDescription>
          )}
        </CardHeader>
        {change.facts && (
          <CardContent className="px-4">
            <FigureBadges facts={change.facts} />
          </CardContent>
        )}
        {change.capabilities.length > 0 && (
          <CardContent className="flex flex-wrap gap-1.5 px-4">
            {shown.map((capability) => (
              <Badge key={capability} variant="outline">
                {capability}
              </Badge>
            ))}
            {hidden > 0 && <Badge variant="secondary">+{hidden}</Badge>}
          </CardContent>
        )}
      </Card>
    </Link>
  );
}

export function ChangeCardList({ changes }: { changes: ChangeSummary[] }) {
  return (
    <div className="not-prose my-6 flex flex-col gap-3">
      {changes.map((change) => (
        <ChangeCard key={change.slug} change={change} />
      ))}
    </div>
  );
}
