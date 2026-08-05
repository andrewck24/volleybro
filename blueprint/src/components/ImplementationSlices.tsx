import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type SliceStatus = "pending" | "completed" | "superseded";

export type ImplementationSlice = {
  id: string;
  title: string;
  capabilities: string[];
  dependsOn: string[];
  outcome: string;
  acceptanceCriteria: string[];
  verification: string[];
  status: string;
};

type Props = {
  slices: ImplementationSlice[];
};

const STATUS_LABEL: Record<SliceStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  superseded: "Superseded",
};

function isSliceStatus(status: string): status is SliceStatus {
  return status in STATUS_LABEL;
}

export function ImplementationSlices({ slices }: Props) {
  for (const slice of slices) {
    if (!isSliceStatus(slice.status)) {
      throw new Error(
        `Unsupported implementation slice status: ${slice.status}`,
      );
    }
  }

  const actionable = slices.filter((slice) => slice.status !== "superseded");
  const completed = actionable.filter(
    (slice) => slice.status === "completed",
  ).length;
  const progress =
    actionable.length === 0 ? 0 : (completed / actionable.length) * 100;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-3">
          <Progress
            value={progress}
            data-testid="implementation-progress"
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground tabular-nums">
            {completed}/{actionable.length}
          </span>
        </CardContent>
      </Card>

      {slices.map((slice) => (
        <Card key={slice.id} data-slice-id={slice.id}>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{slice.id}</Badge>
              <Badge
                variant={slice.status === "completed" ? "default" : "secondary"}
              >
                {STATUS_LABEL[slice.status as SliceStatus]}
              </Badge>
            </div>
            <CardTitle>{slice.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <p className="m-0">{slice.outcome}</p>

            <dl
              data-testid="slice-metadata"
              className="not-prose grid items-start gap-2 sm:grid-cols-[9rem_1fr]"
            >
              <dt className="font-medium">Capabilities</dt>
              <dd className="m-0">{slice.capabilities.join(", ")}</dd>
              <dt className="font-medium">Depends on</dt>
              <dd className="m-0">
                {slice.dependsOn.length === 0
                  ? "None"
                  : slice.dependsOn.join(", ")}
              </dd>
            </dl>

            <div>
              <h3 className="mt-0 text-sm">Acceptance criteria</h3>
              <ul>
                {slice.acceptanceCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mt-0 text-sm">Verification</h3>
              <ul>
                {slice.verification.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
