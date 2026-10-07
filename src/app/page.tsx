import { Landing } from "@/components/landing";
import { StatusBarColor } from "@/components/layout/status-bar-color";
import type { Viewport } from "next";

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

const LandingPage = () => (
  <>
    <StatusBarColor color="var(--free-zone)" />
    <Landing />
  </>
);

export default LandingPage;
