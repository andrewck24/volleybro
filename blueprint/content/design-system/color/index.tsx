import { SwatchGrid, type TokenInfo } from "../_shared";

// Token groups only name the CSS custom property and its role — the rendered
// color and the displayed values come straight from the shared tokens.css
// (src/styles/tokens.css) that the app, landing, and blueprint all import.

const surface: TokenInfo[] = [
  {
    name: "--background",
    usage: "Layer 0 — the page body",
  },
  {
    name: "--popover",
    usage: "Layer 0.5 — non-overlay floats (Popover, Select)",
  },
  {
    name: "--card",
    usage: "Layer 1 — Card / Item + modal surfaces (Dialog/AlertDialog/Drawer)",
  },
  { name: "--muted", usage: "Muted fills and disabled grounds" },
  {
    name: "--accent",
    usage: "Hover / highlight state only (not a page background)",
  },
  { name: "--secondary", usage: "Secondary buttons and chips" },
];

const brand: TokenInfo[] = [
  {
    name: "--primary",
    usage: "Teal — primary actions, brand accent (theme-stable)",
  },
  {
    name: "--destructive",
    usage: "Coral — destructive actions + the logo's right arm (theme-stable)",
  },
];

const feedback: TokenInfo[] = [
  { name: "--success", usage: "Positive outcomes, confirmations" },
  { name: "--warning", usage: "Caution, non-blocking issues" },
  { name: "--info", usage: "Neutral informational accents" },
];

const chart: TokenInfo[] = [
  { name: "--chart-1", usage: "Series 1 — teal (tracks --primary)" },
  { name: "--chart-2", usage: "Series 2 — coral (tracks --destructive)" },
  { name: "--chart-3", usage: "Series 3 — blue" },
  { name: "--chart-4", usage: "Series 4 — amber" },
  { name: "--chart-5", usage: "Series 5 — violet" },
];

const utility: TokenInfo[] = [
  { name: "--border", usage: "Hairline borders and dividers" },
  { name: "--input", usage: "Form control borders" },
  {
    name: "--ring",
    usage: "Focus-visible ring only (containers carry no decorative ring)",
  },
  { name: "--foreground", usage: "Primary text on --background" },
  { name: "--muted-foreground", usage: "Secondary / caption text" },
];

export default function ColorPage() {
  return (
    <div>
      <h1>Color</h1>
      <p>
        Every surface, brand, feedback, and chart token, rendered live from a
        frozen copy of the app&apos;s <code>globals.css</code> token blocks
        (finalized by the elevation-depth-system change). Each swatch is split —
        left half is the light-theme value, right half the dark-theme value —
        and the color strings underneath are resolved from the stylesheet at
        runtime, so this page always shows what the stylesheet actually
        resolves.
      </p>

      <h2 id="surface">Surface &amp; elevation</h2>
      <p>
        Three distinct background layers, ordered by elevation. This is the
        heart of the <code>elevation-depth-system</code> change — see{" "}
        <a href="/design-system/elevation-depth">Elevation &amp; Depth</a> for
        the layering rules and the overlay-replaces-ring model.
      </p>
      <SwatchGrid tokens={surface} />

      <h2 id="brand">Brand</h2>
      <p>
        The two theme-stable brand hues: teal (primary) and coral. Coral is also
        the fixed accent of the logo&apos;s right arm across every ground.
      </p>
      <SwatchGrid tokens={brand} />

      <h2 id="feedback">Feedback</h2>
      <p>Semantic status colors, kept separate from the brand accent.</p>
      <SwatchGrid tokens={feedback} />

      <h2 id="chart">Chart</h2>
      <p>
        The five-series data-visualization palette. Series 1 and 2 track the
        teal and coral brand hues; 3–5 extend the range for dense charts.
      </p>
      <SwatchGrid tokens={chart} />

      <h2 id="utility">Utility &amp; text</h2>
      <SwatchGrid tokens={utility} />
    </div>
  );
}

export const toc = [
  { title: "Surface & elevation", url: "#surface", depth: 2 },
  { title: "Brand", url: "#brand", depth: 2 },
  { title: "Feedback", url: "#feedback", depth: 2 },
  { title: "Chart", url: "#chart", depth: 2 },
  { title: "Utility & text", url: "#utility", depth: 2 },
];
