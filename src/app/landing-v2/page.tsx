import { LandingV2 } from "@/components/landing/prototype-v2";
import { StatusBarColor } from "@/components/layout/status-bar-color";
import type { Viewport } from "next";

// PROTOTYPE: served at `/?variant=v2` through a rewrite in src/proxy.ts. Its
// own route so `/` stays static and the landings never share first-load
// chunks. No landing.css: v2 carries its own world in prototype-v2/v2.css.
// Browser chrome matches the teal free zone: theme-color for first paint
// (light #10687e / dark #0a2f38), then StatusBarColor (the app's own
// mechanism, ADR-0068) paints <html>/<body> and the theme-color meta from the
// resolved theme class.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10687e" },
    { media: "(prefers-color-scheme: dark)", color: "#0a2f38" },
  ],
};

const LandingV2Page = () => (
  <>
    <StatusBarColor color="var(--v2-root)" />
    <LandingV2 />
  </>
);

export default LandingV2Page;
