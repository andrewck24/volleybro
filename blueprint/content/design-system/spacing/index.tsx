// Tailwind v4 spacing: every step is n × 0.25rem (4px at the root font size),
// used via pure-number utilities (p-2, gap-4, pb-21…) — no bracket syntax.
// Values rendered as literal px bars so the scale is theme-independent.

const scale = [
  { step: "0.5", rem: "0.125rem", px: 2 },
  { step: "1", rem: "0.25rem", px: 4 },
  { step: "1.5", rem: "0.375rem", px: 6 },
  { step: "2", rem: "0.5rem", px: 8 },
  { step: "3", rem: "0.75rem", px: 12 },
  { step: "4", rem: "1rem", px: 16 },
  { step: "6", rem: "1.5rem", px: 24 },
  { step: "8", rem: "2rem", px: 32 },
  { step: "12", rem: "3rem", px: 48 },
  { step: "16", rem: "4rem", px: 64 },
];

const appValues = [
  {
    util: "gap-1 / gap-2",
    note: "Court→panel and intra-panel gaps in the game layout",
  },
  {
    util: "pb-21",
    note: "5.25rem (84px) — reserves the drawer idle-peek height so panel content clears it",
  },
  {
    util: "pt-[calc(env(safe-area-inset-top)+5.5rem)]",
    note: "Reserves the fixed game header height once, plus the notch",
  },
  {
    util: "size-8",
    note: "2rem — the unified dialog close/expand control hit area",
  },
];

export default function SpacingPage() {
  return (
    <div>
      <h1>Spacing</h1>
      <p>
        Spacing follows the Tailwind v4 scale — every step is{" "}
        <code>n × 0.25rem</code> (4px). Always use the pure-number utilities (
        <code>p-2</code>, <code>gap-4</code>, <code>pb-21</code>), never the{" "}
        <code>p-[?px]</code> bracket form.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          margin: "20px 0",
        }}
      >
        {scale.map((s) => (
          <div
            key={s.step}
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            <code style={{ width: "56px", fontSize: "0.8rem", flexShrink: 0 }}>
              {s.step}
            </code>
            <div
              style={{
                height: "16px",
                width: `${s.px}px`,
                background: "var(--color-primary)",
                borderRadius: "3px",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                opacity: 0.7,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.rem} · {s.px}px
            </span>
          </div>
        ))}
      </div>

      <h2>Notable app-specific spacings</h2>
      <ul>
        {appValues.map((v) => (
          <li key={v.util}>
            <code>{v.util}</code> — {v.note}
          </li>
        ))}
      </ul>
    </div>
  );
}
