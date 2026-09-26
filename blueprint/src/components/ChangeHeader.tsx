import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { GATE_LABEL } from "@/lib/change-gate";
import type { ChangeFacts } from "@/lib/change-meta";

function figures(facts: ChangeFacts): string[] {
  const shown: string[] = [];
  const add = (value: number | null | undefined, label: string) => {
    if (value) shown.push(`${value} ${label}${value === 1 ? "" : "s"}`);
  };
  add(facts.commits, "commit");
  add(facts.filesChanged, "file");
  if (facts.insertions || facts.deletions) {
    shown.push(`+${facts.insertions ?? 0} / −${facts.deletions ?? 0}`);
  }
  add(facts.srcFilesChanged, "src file");
  add(facts.scenarios, "scenario");
  return shown;
}

export function ChangeHeader({
  title,
  capabilities,
  facts,
}: {
  title: string;
  capabilities: string[];
  facts: ChangeFacts;
}) {
  const shown = figures(facts);
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
      {shown.length > 0 && (
        <p className="m-0 text-sm text-muted-foreground">{shown.join("，")}</p>
      )}
    </header>
  );
}
