import { Fragment } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TimelineEvent {
  date: string;
  label: string;
  description: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

// stub: Thariq #12 incident-timeline 的基本版；需要時再 enrich
export function Timeline({ events }: TimelineProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {events.map((event, i) => (
          <Fragment key={i}>
            {i > 0 && <Separator />}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-muted-foreground">
                {event.date}
              </span>
              <strong className="font-semibold">{event.label}</strong>
              <p className="text-sm text-muted-foreground">
                {event.description}
              </p>
            </div>
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
