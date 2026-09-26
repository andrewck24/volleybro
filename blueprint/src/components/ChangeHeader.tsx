import Link from "next/link";

import { FigureBadges } from "@/components/FigureBadges";
import { Badge } from "@/components/ui/badge";
import { GATE_LABEL } from "@/lib/change-gate";
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
        {facts.gate && <Badge>{GATE_LABEL[facts.gate]}</Badge>}
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
