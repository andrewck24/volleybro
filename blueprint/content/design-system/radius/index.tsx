// Radius scale from src/app/globals.css @theme: --radius: 0.5rem, with
// sm/md/lg/xl derived by ±px. Rendered with literal px so the samples are
// independent of the blueprint's own --radius.

const steps = [
  {
    name: "rounded-sm",
    value: "calc(0.5rem - 4px)",
    px: 4,
    usage: "Badges, small inline chips",
  },
  {
    name: "rounded-md",
    value: "calc(0.5rem - 2px)",
    px: 6,
    usage: "Inputs, buttons",
  },
  {
    name: "rounded-lg",
    value: "0.5rem (--radius)",
    px: 8,
    usage: "Cards, panels, court container",
  },
  {
    name: "rounded-xl",
    value: "calc(0.5rem + 4px)",
    px: 12,
    usage: "Large feature surfaces",
  },
];

export default function RadiusPage() {
  return (
    <div>
      <h1>Radius</h1>
      <p>
        One base token, <code>--radius: 0.5rem</code>, with sm/md/lg/xl derived
        by ±4px steps in the Tailwind <code>@theme</code>. One extra literal is
        worth knowing: overlay surfaces round their top corners at{" "}
        <code>rounded-t-[10px]</code> (the vaul Drawer peek and its skeleton
        mirror).
      </p>
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
                background: "var(--color-primary, hsl(192, 77%, 28%))",
                opacity: 0.9,
              }}
            />
            <code style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              {s.name}
            </code>
            <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>{s.value}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>
              {s.usage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
