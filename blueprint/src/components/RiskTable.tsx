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

export function RiskTable({ risks }: RiskTableProps) {
  const sorted = [...risks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  return (
    <table>
      <thead>
        <tr>
          <th>Risk</th>
          <th>Severity</th>
          <th>Mitigation</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td>{r.severity}</td>
            <td>{r.mitigation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
