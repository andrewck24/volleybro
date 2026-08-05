import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  parseDecisionRecord,
  type DecisionStatus,
} from "@/lib/decision-record";

function statusVariant(status: DecisionStatus) {
  return status === "accepted" || status === "implemented"
    ? "default"
    : "secondary";
}

export function DecisionTimeline({ decisions }: { decisions: unknown[] }) {
  const records = decisions.map(parseDecisionRecord);

  return (
    <div className="not-prose relative my-6 pl-8 before:absolute before:inset-y-3 before:left-3 before:w-px before:bg-border">
      <Accordion
        type="multiple"
        defaultValue={records.map((decision) => decision.id)}
      >
        {records.map((record) => {
          return (
            <AccordionItem
              key={record.id}
              value={record.id}
              className="relative border-0"
            >
              <span className="absolute top-5 -left-5 size-2.5 rounded-full border-2 border-background bg-primary" />
              <AccordionTrigger className="hover:no-underline">
                <span className="flex min-w-0 flex-wrap items-center gap-2 pr-2">
                  <Badge variant="outline">{record.id}</Badge>
                  <span>{record.title}</span>
                  <Badge variant={statusVariant(record.status)}>
                    {record.status}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 pb-5">
                <div className="flex flex-wrap gap-1.5">
                  {record.targets.map((target) => (
                    <Badge key={target} variant="outline">
                      {target}
                    </Badge>
                  ))}
                </div>

                <div className="grid gap-1">
                  <h4 className="m-0 text-sm font-semibold">Context</h4>
                  <p className="m-0 text-sm text-muted-foreground">
                    {record.context}
                  </p>
                </div>

                <div className="grid gap-1">
                  <h4 className="m-0 text-sm font-semibold">Decision</h4>
                  <p className="m-0 text-sm">{record.decision}</p>
                </div>

                {record.alternatives.length > 0 && (
                  <div className="grid gap-2">
                    <h4 className="m-0 text-sm font-semibold">
                      Alternatives not chosen
                    </h4>
                    {record.alternatives.map((alternative) => (
                      <div
                        key={alternative.option}
                        className="rounded-lg border p-3"
                      >
                        <p className="m-0 text-sm font-medium">
                          {alternative.option}
                        </p>
                        <p className="m-0 mt-1 text-sm text-muted-foreground">
                          {alternative.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-1">
                  <h4 className="m-0 text-sm font-semibold">Consequences</h4>
                  <ul className="m-0 grid gap-1 pl-5 text-sm">
                    {record.consequences.map((consequence) => (
                      <li key={consequence}>{consequence}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-1">
                  <h4 className="m-0 text-sm font-semibold">
                    Revisit triggers
                  </h4>
                  <ul className="m-0 grid gap-1 pl-5 text-sm">
                    {record.revisitTriggers.map((trigger) => (
                      <li key={trigger}>{trigger}</li>
                    ))}
                  </ul>
                </div>

                {record.originChange && (
                  <p className="m-0 text-xs text-muted-foreground">
                    Origin Change: {record.originChange}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
