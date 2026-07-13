import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TaskProgressProps {
  done: number;
  total: number;
}

export function TaskProgress({ done, total }: TaskProgressProps) {
  const pct = total === 0 ? 0 : (done / total) * 100;
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <Progress value={pct} data-testid="progress-bar" className="flex-1" />
        <span className="text-sm text-muted-foreground tabular-nums">
          {done}/{total}
        </span>
      </CardContent>
    </Card>
  );
}
