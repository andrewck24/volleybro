import { Landing } from "@/components/landing";
import { StatusBarColor } from "@/components/layout/status-bar-color";
import type { Viewport } from "next";

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
