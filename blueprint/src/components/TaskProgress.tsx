interface TaskProgressProps {
  done: number;
  total: number;
}

export function TaskProgress({ done, total }: TaskProgressProps) {
  const pct = (done / total) * 100;
  return (
    <div>
      <div style={{ width: "100%", background: "#e5e7eb" }}>
        <div data-testid="progress-bar" style={{ width: `${pct}%`, background: "#3b82f6", height: "8px" }} />
      </div>
      <span>{done}/{total}</span>
    </div>
  );
}
