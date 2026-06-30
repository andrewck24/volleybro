import type React from "react";

type Artifact = {
  title: string;
  href: string;
};

type Status = "archived" | "in-progress" | "draft";

type Props = {
  date: string;
  status: Status;
  summary: string;
  artifacts: Artifact[];
};

const STATUS_LABEL: Record<Status, string> = {
  archived: "Archived",
  "in-progress": "In Progress",
  draft: "Draft",
};

const STATUS_STYLE: Record<Status, React.CSSProperties> = {
  archived: {
    background: "color-mix(in oklch, var(--primary) 12%, transparent)",
    color: "var(--primary)",
    border: "1px solid color-mix(in oklch, var(--primary) 35%, transparent)",
  },
  "in-progress": {
    background: "color-mix(in oklch, var(--warning) 12%, transparent)",
    color: "var(--warning)",
    border: "1px solid color-mix(in oklch, var(--warning) 40%, transparent)",
  },
  draft: {
    background: "var(--color-fd-muted, #f3f4f6)",
    color: "var(--color-fd-muted-foreground, #6b7280)",
    border: "1px solid var(--border)",
  },
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      style={{
        ...STATUS_STYLE[status],
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: "18px",
        letterSpacing: "0.01em",
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ArtifactCard({ title, href }: Artifact) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--primary)",
        background: "var(--color-fd-card, #fff)",
        color: "inherit",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: 500,
        transition: "background 0.15s",
        gap: "8px",
      }}
    >
      {title}
      <span
        style={{
          marginLeft: "auto",
          color: "var(--color-fd-muted-foreground, #9ca3af)",
          fontSize: "12px",
        }}
      >
        →
      </span>
    </a>
  );
}

export function ChangeOverview({ date, status, summary, artifacts }: Props) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: "var(--color-fd-muted-foreground, #6b7280)",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {date}
        </span>
        <StatusBadge status={status} />
      </div>

      <p style={{ marginTop: 0, marginBottom: "28px", lineHeight: 1.6 }}>
        {summary}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {artifacts.map((a) => (
          <ArtifactCard key={a.href} {...a} />
        ))}
      </div>
    </div>
  );
}
