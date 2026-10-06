"use client";
// PROTOTYPE (throwaway). The live stats panel (app stats rows + stats
// derivation) loads after hydration, outside the first-load JS. It renders
// inside the page-wide RallyProvider, so it reads the hero's clock.
import dynamic from "next/dynamic";

export const LazyLiveStats = dynamic(
  () =>
    import("@/components/landing/prototype-v2/live-stats").then(
      (m) => m.LiveStats,
    ),
  { ssr: false },
);
