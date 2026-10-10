import { SwatchGrid, type TokenInfo } from "../_shared";

// Token groups only name the CSS custom property and its role — the rendered
// color and the displayed values come straight from the token blocks in
// blueprint/src/app/globals.css, a copy of the app's.

const surface: TokenInfo[] = [
  { name: "--background" },
  { name: "--popover" },
  { name: "--card" },
  { name: "--muted" },
  { name: "--accent" },
  { name: "--secondary" },
];

const brand: TokenInfo[] = [
  { name: "--primary" },
  { name: "--primary-text" },
  { name: "--court" },
  { name: "--court-back-zone" },
  { name: "--destructive" },
  { name: "--destructive-text" },
  { name: "--away" },
  { name: "--away-text" },
  { name: "--error" },
  { name: "--error-text" },
];

const feedback: TokenInfo[] = [
  { name: "--success" },
  { name: "--warning" },
  { name: "--info" },
];

const chart: TokenInfo[] = [
  { name: "--chart-1" },
  { name: "--chart-2" },
  { name: "--chart-3" },
  { name: "--chart-4" },
  { name: "--chart-5" },
];

const utility: TokenInfo[] = [
  { name: "--border" },
  { name: "--input" },
  { name: "--ring" },
  { name: "--foreground" },
  { name: "--muted-foreground" },
];

export default function ColorPage() {
  return (
    <div>
      <h2 id="surface">Surface &amp; elevation</h2>
      <SwatchGrid tokens={surface} />

      <h2 id="brand">Brand</h2>
      <SwatchGrid tokens={brand} />

      <h2 id="feedback">Feedback</h2>
      <SwatchGrid tokens={feedback} />

      <h2 id="chart">Chart</h2>
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
