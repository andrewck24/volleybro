"use client";
// PROTOTYPE (throwaway). The stats carousel's slides, one entry each: the
// description (title, body, optional 開發中) and the component it shows. Each
// component loads lazily (the carousel mounts it when it is, or is next to,
// the active slide) and reads the hero's rally clock. Add a slide = add an
// entry here.
import type { Feature } from "@/components/landing/prototype-v2/copy";
import { LazyLiveStats } from "@/components/landing/prototype-v2/lazy-stats";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// the app's real EntryRow list, as the hero shows it
const HeroEntries = dynamic(
  () =>
    import("@/components/landing/prototype-v2/hero-entries").then(
      (m) => m.HeroEntries,
    ),
  { ssr: false },
);

// v1's point-diff chart
const LazyDiffChart = dynamic(
  () =>
    import("@/components/landing/prototype-v1/cta-diff").then(
      (m) => m.DiffChart,
    ),
  { ssr: false },
);

// whole rows only (.v2-rows rounds down to the slide's height), centred
const Entries = () => (
  <div className="v2-entries flex h-full w-full flex-col justify-center">
    <div className="v2-rows">
      <HeroEntries />
    </div>
  </div>
);

const Diff = () => <LazyDiffChart className="h-48 w-full lg:h-72" />;

export type StatsSlide = Feature & { Component: ComponentType };

export const SLIDES: StatsSlide[] = [
  {
    title: "技術類別統計",
    body: "發球、攻擊、攔網、接發、防守，各自累計得失分。",
    Component: LazyLiveStats,
  },
  {
    title: "逐球記錄",
    body: "每一分怎麼來的，照順序一球一球排好。",
    Component: Entries,
  },
  {
    title: "分差折線圖",
    body: "整局分差的起伏，一條線看清楚。",
    dev: true,
    Component: Diff,
  },
];
