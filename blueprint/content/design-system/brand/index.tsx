// Brand assets. The V symbol paths mirror src/components/brand/logo-symbol.tsx
// (also the source for the apple-splash route). Inlined here because the
// blueprint site cannot import from the parent app's src tree.

const V_ARM_LEFT =
  "M107.01 581.12L102.40 566.27Q95.74 545.79 90.62 526.34L90.62 526.34" +
  "L74.24 470.02Q66.05 442.37 61.44 428.54L61.44 428.54Q57.34 413.18 54.78 405.50" +
  "L54.78 405.50L2.56 228.86L107.01 228.86L202.75 581.12L107.01 581.12Z";
const V_ARM_RIGHT =
  "M225.28 581.12L182.78 424.96L234.50 228.86L336.90 228.86L284.67 405.50" +
  "L265.73 470.02Q256.51 499.71 248.83 526.34L248.83 526.34Q243.71 545.79 237.06 566.27" +
  "L237.06 566.27L232.45 581.12L225.28 581.12Z";
const V_CORAL = "#FC7A56";
const V_IVORY = "#F6F4F5";

// `neutral` is the left-arm color: currentColor for the adaptive variant so it
// inverts with the ground, ivory for the brand variant on the teal ground.
function VSymbol({ neutral, size = 72 }: { neutral: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 225 360 360"
      style={{ display: "block" }}
    >
      <path d={V_ARM_LEFT} fill={neutral} />
      <path d={V_ARM_RIGHT} fill={V_CORAL} />
    </svg>
  );
}

const grounds = [
  {
    label: "Light",
    bg: "hsl(230, 20%, 95.6%)",
    fg: "hsl(0,0%,0%)",
    variant: "adaptive" as const,
  },
  {
    label: "Dark",
    bg: "hsl(217.2, 84%, 4.9%)",
    fg: "hsl(0,0%,100%)",
    variant: "adaptive" as const,
  },
  {
    label: "Teal",
    bg: "hsl(192, 77.46%, 27.84%)",
    fg: V_IVORY,
    variant: "brand" as const,
  },
];

function Tile({
  label,
  bg,
  fg,
  variant,
}: {
  label: string;
  bg: string;
  fg: string;
  variant: "adaptive" | "brand";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "120px",
          borderRadius: "8px",
          background: bg,
          color: fg,
          border: "1px solid rgba(128,128,128,0.25)",
        }}
      >
        <VSymbol neutral={variant === "brand" ? V_IVORY : "currentColor"} />
      </div>
      <span style={{ fontSize: "0.78rem", opacity: 0.75 }}>
        {label} · {variant}
      </span>
    </div>
  );
}

export default function BrandPage() {
  return (
    <div>
      <h1>Brand</h1>
      <p>
        Two marks share one identity. The <strong>logo-symbol</strong> is the
        standalone V; the <strong>logo-type</strong> is the full{" "}
        <em>VolleyBro</em> wordmark. Both are built from the same two arms: a{" "}
        <strong>neutral</strong> left arm and a fixed <strong>coral</strong>{" "}
        right arm (<code>{V_CORAL}</code>).
      </p>

      <h2>Adaptive coloring</h2>
      <p>
        The neutral parts (left arm, and the letters in the wordmark) use{" "}
        <code>currentColor</code>, so the mark inverts with its ground — black
        on light, near-white on dark — while the coral right arm stays fixed as
        the constant brand accent. On the teal brand ground the neutral parts
        switch to ivory (<code>{V_IVORY}</code>), the <code>brand</code>{" "}
        variant. This is what fixed the invisible-white-logo problem on light
        surfaces.
      </p>

      <h2>Logo-symbol on safe grounds</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
          margin: "16px 0",
        }}
      >
        {grounds.map((g) => (
          <Tile key={g.label} {...g} />
        ))}
      </div>

      <h2>Source</h2>
      <ul>
        <li>
          <code>src/components/brand/logo-symbol.tsx</code> — the V, with{" "}
          <code>adaptive</code> / <code>brand</code> variants; consumed by the
          apple-splash route.
        </li>
        <li>
          <code>src/components/brand/logo-type.tsx</code> — the wordmark;
          rendered by <code>src/components/custom/logo.tsx</code>.
        </li>
        <li>
          <code>public/brand/logo-symbol.svg</code> — layered arms (ivory +
          coral, transparent) for Icon Composer / maskable icons.
        </li>
      </ul>
    </div>
  );
}
