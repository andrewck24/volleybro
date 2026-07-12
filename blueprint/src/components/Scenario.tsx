import { Fragment } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ScenarioProps = {
  given: string;
  when: string;
  then: string;
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
            <div className="flex gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {label}
              </span>
              <span>{value}</span>
            </div>
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
