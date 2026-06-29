type SeverityBadgeProps = {
  level: "critical" | "warning" | "info" | "ok";
};

export function SeverityBadge({ level }: SeverityBadgeProps) {
  return <span data-testid="severity-badge" data-level={level}>{level}</span>;
}
