type Artifact = { title: string; href: string };
type Status = "archived" | "in-progress" | "discussing" | "draft";
type Props = { date: string; status: Status; summary: string; artifacts: Artifact[] };

const STATUS_LABEL: Record<Status, string> = {
  archived: "Archived",
  "in-progress": "In Progress",
  discussing: "Discussing",
  draft: "Draft",
};

const STATUS_CLASS: Record<Status, string> = {
  archived:
    "bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] text-[var(--primary)] border border-[color-mix(in_oklch,var(--primary)_35%,transparent)]",
  "in-progress":
    "bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] text-[var(--warning)] border border-[color-mix(in_oklch,var(--warning)_40%,transparent)]",
  discussing:
    "border border-dashed border-[var(--border)] bg-transparent text-[var(--color-fd-muted-foreground)]",
  draft:
    "bg-[var(--color-fd-muted)] text-[var(--color-fd-muted-foreground)] border border-[var(--border)]",
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium leading-[18px] tracking-[0.01em] ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ArtifactCard({ title, href }: Artifact) {
  return (
    <a
      href={href}
      className="flex items-center px-3.5 py-2.5 rounded-lg border border-[color:var(--border)] border-l-[3px] border-l-[color:var(--primary)] bg-[var(--color-fd-card)] text-inherit no-underline text-sm font-medium gap-2 transition-colors duration-150"
    >
      {title}
      <span className="ml-auto text-[var(--color-fd-muted-foreground)] text-xs">→</span>
    </a>
  );
}

export function ChangeOverview({ date, status, summary, artifacts }: Props) {
  return (
    <div>
      <div className="flex gap-2 items-center mb-5 flex-wrap">
        <span className="text-[13px] text-[var(--color-fd-muted-foreground)] font-mono">
          {date}
        </span>
        <StatusBadge status={status} />
      </div>

      <p className="mt-0 mb-7 leading-relaxed">{summary}</p>

      <div className="flex flex-col gap-2">
        {artifacts.map((a) => (
          <ArtifactCard key={a.href} {...a} />
        ))}
      </div>
    </div>
  );
}
