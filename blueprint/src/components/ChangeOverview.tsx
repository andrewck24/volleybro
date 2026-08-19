import Link from "next/link";

import { Card } from "@/components/ui/card";
import { LifecycleBadge } from "@/components/LifecycleBadge";
import type { ChangeLifecycle } from "@/lib/change-types";

type Artifact = { title: string; href: string };
type Props = {
  date: string;
  lifecycle: ChangeLifecycle;
  summary: string;
  artifacts: Artifact[];
};

function ArtifactCard({ title, href }: Artifact) {
  return (
    <Link href={href} className="block text-inherit no-underline">
      <Card className="flex-row items-center gap-2 border-l-4 border-l-primary px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50">
        {title}
        <span className="ml-auto text-xs text-muted-foreground">→</span>
      </Card>
    </Link>
  );
}

export function ChangeOverview({ date, lifecycle, summary, artifacts }: Props) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">{date}</span>
        <LifecycleBadge lifecycle={lifecycle} />
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
