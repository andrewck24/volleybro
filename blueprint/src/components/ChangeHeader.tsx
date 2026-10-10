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
  const stateLabel = facts.archivedAt ? "archived" : gateLabel(facts);

  return (
    <header className="not-prose mb-6 flex flex-col gap-3">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        {(facts.archivedAt || facts.gate || facts.shards?.current) && (
          <Badge>{stateLabel}</Badge>
        )}
        {mergedLabel(facts) && (
          <Badge variant="secondary">{mergedLabel(facts)}</Badge>
        )}
        {capabilities.map((capability) => (
          <Badge key={capability} variant="outline" asChild>
            <a href={`/features/${capability}`}>{capability}</a>
          </Badge>
        ))}
      </div>
      <FigureBadges facts={facts} />
    </header>
  );
}
