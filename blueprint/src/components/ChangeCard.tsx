type Status = "archived" | "in-progress" | "discussing" | "draft";
type Props = { name: string; date?: string; status: Status; summary: string; href?: string };

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

export function ChangeCard({ name, date, status, summary, href }: Props) {
  const inner = (
    <div className="px-5 py-4 rounded-xl border border-[color:var(--border)] border-l-[3px] border-l-[color:var(--primary)] bg-[var(--color-fd-card)] flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[13px] font-semibold text-[var(--color-fd-foreground)]">
          {name}
        </code>
        <span
          className={`inline-block px-[7px] py-px rounded-full text-[11px] font-medium leading-[18px] ${STATUS_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
        {date && (
          <span className="ml-auto text-xs text-[var(--color-fd-muted-foreground)] font-mono">
            {date}
          </span>
        )}
      </div>
      <p className="m-0 text-sm text-[var(--color-fd-muted-foreground)] leading-snug">
        {summary}
      </p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="no-underline text-inherit block">
        {inner}
      </a>
    );
  }
  return inner;
}
