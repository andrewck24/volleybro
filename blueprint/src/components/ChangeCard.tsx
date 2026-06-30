import type React from "react";

type Status = "archived" | "in-progress" | "draft";

type Props = {
  name: string;
  date?: string;
  status: Status;
  summary: string;
  href?: string;
};

const STATUS_LABEL: Record<Status, string> = {
  archived: "Archived",
  "in-progress": "In Progress",
  draft: "Draft",
};

const STATUS_STYLE: Record<Status, React.CSSProperties> = {
  archived: {
    background: "var(--brand-light)",
    color: "var(--brand)",
    border: "1px solid var(--brand-border)",
  },
  "in-progress": {
    background: "var(--brand-in-progress-light)",
    color: "var(--brand-in-progress)",
    border: "1px solid var(--brand-in-progress-border)",
  },
  draft: {
    background: "var(--color-fd-muted, #f3f4f6)",
    color: "var(--color-fd-muted-foreground, #6b7280)",
    border: "1px solid var(--color-fd-border, #e5e7eb)",
  },
};

export function ChangeCard({ name, date, status, summary, href }: Props) {
  const inner = (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "10px",
        border: "1px solid var(--color-fd-border, #e5e7eb)",
        borderLeft: "3px solid var(--brand)",
        background: "var(--color-fd-card, #fff)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <code
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--color-fd-foreground)",
          }}
        >
          {name}
        </code>
        <span
          style={{
            ...STATUS_STYLE[status],
            display: "inline-block",
            padding: "1px 7px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 500,
            lineHeight: "18px",
          }}
        >
          {STATUS_LABEL[status]}
        </span>
        {date && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              color: "var(--color-fd-muted-foreground, #9ca3af)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {date}
          </span>
        )}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "14px",
          color: "var(--color-fd-muted-foreground, #6b7280)",
          lineHeight: 1.5,
        }}
      >
        {summary}
      </p>
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {inner}
      </a>
    );
  }
  return inner;
}
