// Elevation & Depth — the heart of the elevation-depth-system change.
// A: the three background layers. B: the overlay-replaces-ring rule.
// C: the overlay-variant comparison that decides the open Drawer-layer question
// (design.md D6). All colors are literal app hsl values, shown in both themes.

type LayerHsl = { light: string; dark: string };
const L = {
  background: { light: "hsl(230, 20%, 95.6%)", dark: "hsl(217.2, 84%, 4.9%)" },
  popover: { light: "hsl(230, 14%, 97%)", dark: "hsl(217.2, 28%, 10%)" },
  card: { light: "hsl(330, 10%, 98.45%)", dark: "hsl(217.2, 20.6%, 14.5%)" },
  fg: { light: "hsl(0,0%,0%)", dark: "hsl(0,0%,96%)" },
  border: { light: "hsl(230, 14%, 88.2%)", dark: "hsl(217.2, 32.6%, 30.5%)" },
} satisfies Record<string, LayerHsl>;

const layers = [
  {
    name: "Level 0 · Page",
    token: "--background",
    step: "95.6% L / 4.9% D",
    body: "The app body. Overlay-backed modals (Dialog, AlertDialog, Drawer) also sit here — their dimming overlay, not a lighter surface, separates them from the page.",
  },
  {
    name: "Level 0.5 · Floating",
    token: "--popover",
    step: "97% L / 10% D",
    body: "Non-overlay floating surfaces (Popover, Select) that open over live content. A distinct value + shadow-md keeps them raised with no overlay to help.",
  },
  {
    name: "Level 1 · Card",
    token: "--card",
    step: "98.45% L / 14.5% D",
    body: "Cards and items — the topmost surface, sitting on any layer beneath with ring + shadow.",
  },
];

// A nested page→floating→card stack rendered in one theme's values.
function LayerStack({ theme, label }: { theme: "light" | "dark"; label: string }) {
  const t = (k: keyof typeof L) => L[k][theme];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>{label}</span>
      <div style={{ background: t("background"), color: t("fg"), padding: "16px", borderRadius: "10px", border: `1px solid ${t("border")}` }}>
        <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>--background</span>
        <div style={{ background: t("popover"), padding: "14px", borderRadius: "8px", marginTop: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>--popover</span>
          <div style={{ background: t("card"), padding: "12px", borderRadius: "6px", marginTop: "8px", border: `1px solid ${t("border")}` }}>
            <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>--card</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// One overlay surface over a dimmed scrim, in a chosen surface color / ring.
function OverlayDemo({
  theme,
  surface,
  ring,
  caption,
}: {
  theme: "light" | "dark";
  surface: string;
  ring: boolean;
  caption: string;
}) {
  const t = (k: keyof typeof L) => L[k][theme];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={{
          position: "relative",
          height: "130px",
          borderRadius: "8px",
          overflow: "hidden",
          background: t("background"),
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)" }} />
        <div
          style={{
            position: "absolute",
            left: "14px",
            right: "14px",
            bottom: "14px",
            padding: "12px",
            borderRadius: "8px",
            background: surface === "background" ? t("background") : t("card"),
            color: t("fg"),
            border: ring ? `1px solid ${t("border")}` : "none",
            fontSize: "0.75rem",
          }}
        >
          overlay surface · bg-{surface}
          {ring ? " · ring" : " · no ring"}
        </div>
      </div>
      <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>{caption}</span>
    </div>
  );
}

export default function ElevationDepthPage() {
  return (
    <div>
      <h1>Elevation &amp; Depth</h1>
      <p>
        Two rules govern depth. First, three distinct background layers ordered
        by elevation. Second — <strong>overlay replaces ring</strong>: a surface
        signals its depth with a dimming overlay <em>or</em> a ring, never both.
      </p>

      <h2>A · Background layers</h2>
      <p>
        Elevation reads as a lighter surface in light theme, inverted in dark.
        The same nested stack in both themes:
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", margin: "16px 0" }}>
        <LayerStack theme="light" label="Light theme" />
        <LayerStack theme="dark" label="Dark theme" />
      </div>
      <ul>
        {layers.map((l) => (
          <li key={l.token}>
            <strong>{l.name}</strong> (<code>{l.token}</code>, {l.step}) — {l.body}
          </li>
        ))}
      </ul>

      <h2>B · Overlay replaces ring</h2>
      <p>
        Overlay-backed surfaces (Dialog, AlertDialog, Drawer — anything with a{" "}
        <code>bg-black/80</code> scrim) drop the ring; the scrim is the depth
        cue. Non-overlay floats (Popover, Select) keep <code>ring</code> +{" "}
        <code>shadow-md</code>, since with no scrim the ring is their only edge.
        This makes the <code>entry-ui</code> observation (removing the ring
        looked better) a contract, so nothing silently re-adds one.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", margin: "16px 0" }}>
        <OverlayDemo theme="light" surface="background" ring={false} caption="✓ Overlay-backed: no ring (correct)" />
        <OverlayDemo theme="light" surface="background" ring caption="✗ Overlay-backed with ring: double-bordered" />
      </div>

      <h2>C · Overlay-layer comparison (Drawer decision)</h2>
      <p>
        Open question (design.md <strong>D6</strong>): the vaul Drawer currently
        sits on <code>bg-card</code>, but the overlay rule (D1) says
        overlay-backed → layer 0 (<code>bg-background</code>). Both are plausible
        since <code>--card</code> is unchanged. The two candidates, both without
        a ring, in each theme:
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", margin: "16px 0" }}>
        <OverlayDemo theme="light" surface="background" ring={false} caption="Light · bg-background (per overlay rule)" />
        <OverlayDemo theme="light" surface="card" ring={false} caption="Light · bg-card (current)" />
        <OverlayDemo theme="dark" surface="background" ring={false} caption="Dark · bg-background (per overlay rule)" />
        <OverlayDemo theme="dark" surface="card" ring={false} caption="Dark · bg-card (current)" />
      </div>
      <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
        Recommendation: align Drawer to <code>bg-background</code> for
        consistency with Dialog/AlertDialog — the dark comparison shows the
        clearest case, where a card-level sheet reads as a lighter slab floating
        above the dimmed page rather than a peer of the modal surfaces. Record
        the final call back into tasks §8 and design.md D6.
      </p>
    </div>
  );
}
