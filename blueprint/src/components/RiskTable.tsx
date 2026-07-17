import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Severity = "critical" | "warning" | "info" | "ok";

type Risk = {
  name: string;
  severity: Severity;
  mitigation: string;
};

type RiskTableProps = {
  risks: Risk[];
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  ok: 3,
};

const SEVERITY_BADGE: Record<
  Severity,
  { variant: React.ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  critical: { variant: "destructive" },
  warning: {
    variant: "outline",
    className: "border-warning/40 bg-warning/10 text-warning",
  },
  info: { variant: "secondary" },
  ok: { variant: "outline" },
};

export function RiskTable({ risks }: RiskTableProps) {
  const sorted = [...risks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Risk</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Mitigation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.name}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell>
              <Badge
                variant={SEVERITY_BADGE[r.severity].variant}
                data-severity={r.severity}
                className={SEVERITY_BADGE[r.severity].className}
              >
                {r.severity}
              </Badge>
            </TableCell>
            <TableCell className="whitespace-normal">{r.mitigation}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
