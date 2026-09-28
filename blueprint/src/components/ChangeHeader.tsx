import Link from "next/link";

import { FigureBadges } from "@/components/FigureBadges";
import { Badge } from "@/components/ui/badge";
import { gateLabel, mergedLabel } from "@/lib/change-gate";
import type { ChangeFacts } from "@/lib/change-meta";

export function ChangeHeader({
  title,
  capabilities,
  facts,
}: {
  title: string;
  capabilities: string[];
  facts: ChangeFacts;
}) {
  return (
    <header className="not-prose mb-6 flex flex-col gap-3">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        {facts.gate && <Badge>{gateLabel(facts)}</Badge>}
        {mergedLabel(facts) && (
          <Badge variant="secondary">{mergedLabel(facts)}</Badge>
        )}
        {capabilities.map((capability) => (
          <Badge key={capability} variant="outline" asChild>
            <Link href={`/features/${capability}`}>{capability}</Link>
          </Badge>
        ))}
      </div>
      <FigureBadges facts={facts} />
    </header>
  );
}
