"use client";

import { CardItem, CardList } from "@/components/CardList";
import { Badge } from "@/components/ui/badge";
import type { DecisionRecord } from "@/lib/decision-record";
import { cn } from "@/lib/utils";

export type DecisionCard = {
  record: DecisionRecord;
  supersededHref?: string;
};

function VerdictBadge({ adopted }: { adopted: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "mt-0.5",
        adopted
          ? "bg-primary/10 text-primary dark:bg-primary/20"
          : "bg-destructive/10 text-destructive dark:bg-destructive/20",
      )}
    >
      {adopted ? "採用" : "棄用"}
    </Badge>
  );
}

export function DecisionCards({ cards }: { cards: DecisionCard[] }) {
  if (cards.length === 0) return null;

  return (
    <CardList>
      {cards.map(({ record, supersededHref }) => (
        <CardItem
          key={record.id}
          value={record.id}
          id={`adr-${record.id}`}
          summary={
            <>
              <Badge variant="outline">ADR-{record.id}</Badge>
              <span className="text-sm font-medium">{record.title}</span>
              {record.supersededBy && (
                <Badge variant="secondary">
                  被 ADR-{record.supersededBy} 取代
                </Badge>
              )}
            </>
          }
        >
          {record.supersededBy && supersededHref && (
            <a href={supersededHref} className="text-sm">
              查看取代它的 ADR-{record.supersededBy}
            </a>
          )}
          <div className="flex items-start gap-2">
            <VerdictBadge adopted />
            <p className="m-0 text-sm text-foreground">{record.decision}</p>
          </div>
          {record.alternatives?.map((alternative) => (
            <div key={alternative.option} className="flex items-start gap-2">
              <VerdictBadge adopted={false} />
              <p className="m-0 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {alternative.option}
                </span>
                ：{alternative.reason}
              </p>
            </div>
          ))}
        </CardItem>
      ))}
    </CardList>
  );
}
