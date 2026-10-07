"use client";
// One entry per slide: its description and the component it shows. Slides
// load lazily, mounted only when active or adjacent, and read the rally clock.
import type { Feature } from "@/components/landing/copy";
import { EntryRows } from "@/components/landing/entry-rows";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const LiveStats = dynamic(
  () => import("@/components/landing/live-stats").then((m) => m.LiveStats),
  { ssr: false },
);

const DiffChart = dynamic(
  () => import("@/components/landing/diff-chart").then((m) => m.DiffChart),
  { ssr: false },
);

const Entries = () => (
  <div className="landing-entries flex h-full w-full flex-col justify-center">
    <EntryRows />
  </div>
);

const Diff = () => <DiffChart className="h-48 w-full lg:h-72" />;

export type StatsSlide = Feature & { Component: ComponentType };

export const SLIDES: StatsSlide[] = [
  {
    title: "技術類別統計",
    body: "發球、攻擊、攔網、接發、防守，各自累計得失分。",
    Component: LiveStats,
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
