"use client";
import { Figure } from "@/components/custom/stats/figures";
import { PrototypeSwitcher } from "@/components/landing/prototype-entry/prototype-switcher";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

// PROTOTYPE: three abstractions of the Entry row for the landing Hero.
// Question: how should EntryText look with no text/numbers?
// Mounted on `/` via ?variant=A|B|C (absent = nothing rendered).

// newest first; true = home scored (rally.tsx `win`)
const ENTRIES = [true, true, false, true, false, false, true, true];

const VARIANTS = [
  { key: "A", name: "Solid bar" },
  { key: "B", name: "Blurred smear" },
  { key: "C", name: "Skeleton" },
];

type Side = "home" | "away";

const IconWin = () => <FiPlus className="size-6 text-primary" />;
const IconLose = () => <FiMinus className="size-6 text-destructive" />;

const icon = (win: boolean, side: Side) =>
  (side === "home") === win ? <IconWin /> : <IconLose />;

// shared row frame: two figures + two bars, same win/lose colouring as rally.tsx
const Row = ({
  win,
  bar,
}: {
  win: boolean;
  bar: (side: Side) => React.ReactNode;
}) => (
  <div className="flex w-full flex-row items-center gap-1 rounded-md p-1">
    <Figure size="sm" variant={win ? "primary" : "secondary"} />
    <Figure size="sm" variant={win ? "secondary" : "destructive"} />
    {bar("home")}
    {bar("away")}
  </div>
);

const barFrame = (side: Side) =>
  cn(
    "flex h-6 flex-1 items-center gap-1 border-l-2 px-1",
    side === "home" ? "border-primary" : "border-destructive",
  );

// A: whole bar is a solid muted fill, icon on top
const VariantA = () =>
  ENTRIES.map((win, i) => (
    <Row
      key={i}
      win={win}
      bar={(side) => (
        <div className={cn(barFrame(side), "rounded-r bg-accent")}>
          {icon(win, side)}
        </div>
      )}
    />
  ));

// B: bar is empty; a blurred colour smear sits behind a crisp icon
const smear = ["w-3/5", "w-4/5", "w-2/5", "w-1/2", "w-2/3"];
const VariantB = () =>
  ENTRIES.map((win, e) => (
    <Row
      key={e}
      win={win}
      bar={(side) => (
        <div className={cn(barFrame(side), "relative overflow-hidden")}>
          <span
            className={cn(
              "absolute inset-y-1 left-1 rounded-full blur-[6px]",
              smear[(e + (side === "home" ? 0 : 2)) % smear.length],
              side === "home" ? "bg-primary/60" : "bg-destructive/60",
            )}
          />
          <span className="relative">{icon(win, side)}</span>
        </div>
      )}
    />
  ));

// C: transparent bar holding skeleton shapes (avatar dot + text pill), pulsing
const pill = ["w-10", "w-14", "w-8", "w-12", "w-16"];
const VariantC = () =>
  ENTRIES.map((win, e) => (
    <Row
      key={e}
      win={win}
      bar={(side) => (
        <div className={barFrame(side)}>
          <span className="size-5 shrink-0 animate-pulse rounded-full bg-muted-foreground/25" />
          <span
            className={cn(
              "h-2.5 animate-pulse rounded-full bg-muted-foreground/25",
              pill[(e + (side === "home" ? 0 : 3)) % pill.length],
            )}
          />
          <span className="ml-auto">{icon(win, side)}</span>
        </div>
      )}
    />
  ));

const Inner = () => {
  const variant = useSearchParams().get("variant");
  if (!variant) return null;

  return (
    <>
      <section className="flex w-full justify-center bg-background px-4 py-12">
        <div className="h-96 w-full max-w-md overflow-hidden rounded-xl bg-card [mask-image:linear-gradient(to_bottom,black_75%,transparent)] p-3 shadow-md">
          <div className="flex flex-col gap-1">
            {variant === "B" ? (
              <VariantB />
            ) : variant === "C" ? (
              <VariantC />
            ) : (
              <VariantA />
            )}
          </div>
        </div>
      </section>
      <PrototypeSwitcher variants={VARIANTS} />
    </>
  );
};

export const HeroEntryPrototype = () => (
  <Suspense>
    <Inner />
  </Suspense>
);
