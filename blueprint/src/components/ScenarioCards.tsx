"use client";

import { CardItem, CardList } from "@/components/CardList";
import { Scenario } from "@/components/Scenario";
import { Badge } from "@/components/ui/badge";
import { renderInline } from "@/lib/render-inline";
import { cn } from "@/lib/utils";

export type ScenarioData = {
  id: string;
  given: string;
  when: string;
  then: string;
};

export type Outcome = "pass" | "fail" | "pending";

export type ScenarioResult = {
  id: string;
  result: Outcome;
  evidence: string;
};

export type TestPlanItem = {
  id: string;
  checks: string;
  method: string;
  executor: "agent" | "developer";
  environment: string;
  result: Outcome;
  evidence?: string;
};

const OUTCOME_LABEL: Record<Outcome, string> = {
  pass: "通過",
  fail: "失敗",
  pending: "待執行",
};

const OUTCOME_CLASS: Record<Outcome, string> = {
  pass: "bg-success/10 text-success dark:bg-success/20",
  fail: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  pending: "bg-muted text-muted-foreground",
};

export function OutcomeBadge({ result }: { result: Outcome }) {
  return (
    <Badge variant="outline" className={OUTCOME_CLASS[result]}>
      {OUTCOME_LABEL[result]}
    </Badge>
  );
}

export function Scenarios({ items }: { items: ScenarioData[] }) {
  return (
    <div className="not-prose my-4 flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1.5">
          <Badge variant="outline">{item.id}</Badge>
          <Scenario given={item.given} when={item.when} then={item.then} />
        </div>
      ))}
    </div>
  );
}

export function ScenarioResults({
  scenarios,
  results,
}: {
  scenarios: ScenarioData[];
  results: ScenarioResult[];
}) {
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  return (
    <section>
      <h2>驗收結果</h2>
      <CardList>
        {results.map((item) => {
          const scenario = byId.get(item.id);
          return (
            <CardItem
              key={item.id}
              value={item.id}
              summary={
                <>
                  <Badge variant="outline">{item.id}</Badge>
                  <OutcomeBadge result={item.result} />
                  <span className="text-sm">{renderInline(item.evidence)}</span>
                </>
              }
            >
              {scenario ? (
                <Scenario
                  given={scenario.given}
                  when={scenario.when}
                  then={scenario.then}
                />
              ) : (
                <p className="m-0 text-sm text-destructive">
                  這個結果對應的 scenario {item.id} 不存在
                </p>
              )}
            </CardItem>
          );
        })}
      </CardList>
    </section>
  );
}

export function TestPlan({ items }: { items: TestPlanItem[] }) {
  return (
    <section>
      <h2>Test plan</h2>
      <CardList>
        {items.map((item) => {
          const isDeveloperRun = item.executor === "developer";
          return (
            <CardItem
              key={item.id}
              value={item.id}
              className={cn(
                isDeveloperRun && "border-l-4 border-l-warning bg-warning/5",
              )}
              summary={
                <>
                  <Badge variant="outline">{item.id}</Badge>
                  <span className="text-sm font-medium">
                    {renderInline(item.checks)}
                  </span>
                  <Badge variant={isDeveloperRun ? "default" : "secondary"}>
                    {isDeveloperRun ? "開發者執行" : "agent 執行"}
                  </Badge>
                  <OutcomeBadge result={item.result} />
                </>
              }
            >
              <dl className="m-0 grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">方法</dt>
                <dd className="m-0">{renderInline(item.method)}</dd>
                <dt className="text-muted-foreground">環境</dt>
                <dd className="m-0">{item.environment}</dd>
                {item.evidence && (
                  <>
                    <dt className="text-muted-foreground">證據</dt>
                    <dd className="m-0">{renderInline(item.evidence)}</dd>
                  </>
                )}
              </dl>
            </CardItem>
          );
        })}
      </CardList>
    </section>
  );
}
