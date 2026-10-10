const steps = [
  {
    name: "rounded-sm",
    value: "calc(0.5rem - 4px)",
    px: 4,
  },
  {
    name: "rounded-md",
    value: "calc(0.5rem - 2px)",
    px: 6,
  },
  {
    name: "rounded-lg",
    value: "0.5rem (--radius)",
    px: 8,
  },
  {
    name: "rounded-xl",
    value: "calc(0.5rem + 4px)",
    px: 12,
  },
];

export default function RadiusPage() {
  return (
    <div>
      <h2 id="steps">Steps</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "20px",
          margin: "20px 0",
        }}
      >
        {steps.map((s) => (
          <div
            key={s.name}
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <div
              style={{
                height: "84px",
                borderTopLeftRadius: `${s.px}px`,
                borderTopRightRadius: `${s.px}px`,
                background: "var(--color-primary)",
                opacity: 0.9,
              }}
            />
            <code style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              {s.name}
            </code>
            <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const toc = [{ title: "Steps", url: "#steps", depth: 2 }];
