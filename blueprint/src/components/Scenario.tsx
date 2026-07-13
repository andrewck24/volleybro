import { Fragment } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ScenarioProps = {
  given: string;
  when: string;
  then: string;
};

const LABEL_COLOR: Record<string, string> = {
  GIVEN: "text-muted-foreground",
  WHEN: "text-primary",
  THEN: "text-warning",
};

export function Scenario({ given, when, then }: ScenarioProps) {
  const steps: Array<[string, string]> = [
    ["GIVEN", given],
    ["WHEN", when],
    ["THEN", then],
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        {steps.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 && <Separator />}
            <div className="grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4">
              <span
                className={
                  "font-mono text-xs font-semibold tracking-wide uppercase " +
                  LABEL_COLOR[label]
                }
              >
                {label}
              </span>
              <span className="text-sm leading-relaxed">{value}</span>
            </div>
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
