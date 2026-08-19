import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { LifecycleBadge } from "@/components/LifecycleBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChangeLifecycle } from "@/lib/change-types";

type Props = {
  name: string;
  date?: string;
  lifecycle: ChangeLifecycle;
  summary: string;
  href?: string;
  capabilities?: string[];
  tags?: string[];
};

export function ChangeCard({
  name,
  date,
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
          <LifecycleBadge lifecycle={lifecycle} />
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
