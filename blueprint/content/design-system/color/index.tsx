import { SwatchGrid, type Token } from "../_shared";

// All values sourced from src/app/globals.css (:root = light, .dark = dark),
// including the elevation-depth-system three-layer background change.

const surface: Token[] = [
  {
    name: "--background",
    light: "hsl(230, 20%, 95.6%)",
    dark: "hsl(217.2, 84%, 4.9%)",
    usage: "Layer 0 — page body + overlay surfaces (Dialog/AlertDialog/Drawer)",
  },
  {
    name: "--popover",
    light: "hsl(230, 14%, 97%)",
    dark: "hsl(217.2, 28%, 10%)",
    usage: "Layer 0.5 — non-overlay floats (Popover, Select)",
  },
  {
    name: "--card",
    light: "hsl(330, 10%, 98.45%)",
    dark: "hsl(217.2, 20.6%, 14.5%)",
    usage: "Layer 1 — Card / Item surfaces",
  },
  {
    name: "--muted",
    light: "hsl(230, 14%, 90.4%)",
    dark: "hsl(217.2, 10.6%, 37.5%)",
    usage: "Muted fills and disabled grounds",
  },
  {
    name: "--accent",
    light: "hsl(230, 20%, 95.6%)",
    dark: "hsl(192, 5%, 5.5%)",
    usage: "Hover / highlight state only (not a page background)",
  },
  {
    name: "--secondary",
    light: "hsl(230, 18%, 93.8%)",
    dark: "hsl(217.2, 32.6%, 27.5%)",
    usage: "Secondary buttons and chips",
  },
];

const brand: Token[] = [
  {
    name: "--primary",
    light: "hsl(192, 77.46%, 27.84%)",
    dark: "hsl(192, 77.46%, 27.84%)",
    usage: "Teal — primary actions, brand accent (theme-stable)",
  },
  {
    name: "--destructive",
    light: "hsl(13.01, 96.51%, 66.27%)",
    dark: "hsl(13.01, 96.51%, 66.27%)",
    usage: "Coral — destructive actions + the logo's right arm (theme-stable)",
  },
];

const feedback: Token[] = [
  {
    name: "--success",
    light: "hsl(152, 60%, 36%)",
    dark: "hsl(152, 55%, 45%)",
    usage: "Positive outcomes, confirmations",
  },
  {
    name: "--warning",
    light: "hsl(38, 92%, 50%)",
    dark: "hsl(38, 90%, 55%)",
    usage: "Caution, non-blocking issues",
  },
  {
    name: "--info",
    light: "hsl(210, 70%, 50%)",
    dark: "hsl(210, 65%, 55%)",
    usage: "Neutral informational accents",
  },
];

const chart: Token[] = [
  {
    name: "--chart-1",
    light: "hsl(192, 77%, 28%)",
    dark: "hsl(192, 70%, 45%)",
    usage: "Series 1 — teal (tracks --primary)",
  },
  {
    name: "--chart-2",
    light: "hsl(13, 97%, 66%)",
    dark: "hsl(13, 90%, 70%)",
    usage: "Series 2 — coral (tracks --destructive)",
  },
  {
    name: "--chart-3",
    light: "hsl(210, 65%, 45%)",
    dark: "hsl(210, 60%, 55%)",
    usage: "Series 3 — blue",
  },
  {
    name: "--chart-4",
    light: "hsl(38, 92%, 50%)",
    dark: "hsl(38, 85%, 60%)",
    usage: "Series 4 — amber",
  },
  {
    name: "--chart-5",
    light: "hsl(270, 40%, 55%)",
    dark: "hsl(270, 45%, 65%)",
    usage: "Series 5 — violet",
  },
];

const utility: Token[] = [
  {
    name: "--border",
    light: "hsl(230, 14%, 88.2%)",
    dark: "hsl(217.2, 32.6%, 30.5%)",
    usage: "Hairline borders and dividers",
  },
  {
    name: "--input",
    light: "hsl(230, 14%, 88.2%)",
    dark: "hsl(217.2, 32.6%, 27.5%)",
    usage: "Form control borders",
  },
  {
    name: "--ring",
    light: "hsl(230, 16%, 86.5%)",
    dark: "hsl(212.7, 26.8%, 83.9%)",
    usage: "Focus ring + non-overlay float edge",
  },
  {
    name: "--foreground",
    light: "hsl(0, 0%, 0%)",
    dark: "hsl(217.2, 10%, 96.08%)",
    usage: "Primary text on --background",
  },
  {
    name: "--muted-foreground",
    light: "hsl(0, 0%, 38.43%)",
    dark: "hsl(215, 20.2%, 65.1%)",
    usage: "Secondary / caption text",
  },
];

export default function ColorPage() {
  return (
    <div>
      <h1>Color</h1>
      <p>
        Every surface, brand, feedback, and chart token, with its light and dark
        value. Each swatch is split — left half is the light-theme value, right
        half the dark-theme value — so the pair reads at a glance regardless of
        the theme you&apos;re viewing this page in.
      </p>

      <h2>Surface &amp; elevation</h2>
      <p>
        Three distinct background layers, ordered by elevation. This is the
        heart of the <code>elevation-depth-system</code> change — see{" "}
        <a href="/design-system/elevation-depth">Elevation &amp; Depth</a> for
        the layering rules and the overlay-replaces-ring model.
      </p>
      <SwatchGrid tokens={surface} />

      <h2>Brand</h2>
      <p>
        The two theme-stable brand hues: teal (primary) and coral. Coral is also
        the fixed accent of the logo&apos;s right arm across every ground.
      </p>
      <SwatchGrid tokens={brand} />

      <h2>Feedback</h2>
      <p>Semantic status colors, kept separate from the brand accent.</p>
      <SwatchGrid tokens={feedback} />

      <h2>Chart</h2>
      <p>
        The five-series data-visualization palette. Series 1 and 2 track the
        teal and coral brand hues; 3–5 extend the range for dense charts.
      </p>
      <SwatchGrid tokens={chart} />

      <h2>Utility &amp; text</h2>
      <SwatchGrid tokens={utility} />
    </div>
  );
}
