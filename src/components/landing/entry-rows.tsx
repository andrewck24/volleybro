"use client";
import dynamic from "next/dynamic";

// The app's real EntryRow list: lazy, so the entry and game modules stay out
// of the first load. It reads the rally clock.
const HeroEntries = dynamic(
  () => import("@/components/landing/hero-entries").then((m) => m.HeroEntries),
  { ssr: false },
);

/** Whole rows only: the height rounds down to the container's. */
export const EntryRows = () => (
  <div className="landing-entry-rows">
    <HeroEntries />
  </div>
);
