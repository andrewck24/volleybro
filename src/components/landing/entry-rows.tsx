"use client";
import dynamic from "next/dynamic";

const HeroEntries = dynamic(
  () => import("@/components/landing/hero-entries").then((m) => m.HeroEntries),
  { ssr: false },
);

export const EntryRows = () => (
  <div className="landing-entry-rows">
    <HeroEntries />
  </div>
);
