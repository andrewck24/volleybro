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
    background: "hsl(var(--primary) / 0.1)",
    color: "hsl(var(--primary))",
    border: "1px solid hsl(var(--primary) / 0.3)",
  },
  "in-progress": {
    background: "hsl(var(--warning) / 0.12)",
    color: "hsl(var(--warning))",
    border: "1px solid hsl(var(--warning) / 0.4)",
  },
  draft: {
    background: "var(--color-fd-muted, #f3f4f6)",
    color: "var(--color-fd-muted-foreground, #6b7280)",
    border: "1px solid var(--color-fd-border, #e5e7eb)",
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
        border: "1px solid var(--color-fd-border, #e5e7eb)",
        borderLeft: "3px solid hsl(var(--primary))",
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
