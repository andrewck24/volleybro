"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// PROTOTYPE: floating ?variant= / &cta= switcher (dev only).
// Keys: ←/→ page variant, [ / ] closing-CTA option.
type Opt = { key: string; name: string };

const Row = ({
  label,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={onPrev}
      className="size-9 rounded-full"
      aria-label={prevLabel}
    >
      &larr;
    </button>
    <span className="min-w-44 text-center whitespace-nowrap">{label}</span>
    <button
      type="button"
      onClick={onNext}
      className="size-9 rounded-full"
      aria-label={nextLabel}
    >
      &rarr;
    </button>
  </div>
);

export const PrototypeSwitcher = ({
  variants,
  current,
  ctas,
  cta,
}: {
  variants: Opt[];
  current: string;
  ctas: Opt[];
  cta: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const vi = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );
  const ci = Math.max(
    0,
    ctas.findIndex((c) => c.key === cta),
  );

  const go = (dv: number, dc: number) => {
    const v = variants[(vi + dv + variants.length) % variants.length]!;
    const c = ctas[(ci + dc + ctas.length) % ctas.length]!;
    router.replace(`${pathname}?variant=${v.key}&cta=${c.key}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1, 0);
      if (e.key === "ArrowRight") go(1, 0);
      if (e.key === "[") go(0, -1);
      if (e.key === "]") go(0, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center rounded-3xl bg-foreground px-2 py-1 text-sm text-background shadow-lg">
      <Row
        label={`${variants[vi]!.key} — ${variants[vi]!.name}`}
        onPrev={() => go(-1, 0)}
        onNext={() => go(1, 0)}
        prevLabel="上一個頁面變體"
        nextLabel="下一個頁面變體"
      />
      <Row
        label={`CTA ${ctas[ci]!.key} — ${ctas[ci]!.name}`}
        onPrev={() => go(0, -1)}
        onNext={() => go(0, 1)}
        prevLabel="上一個結尾 CTA"
        nextLabel="下一個結尾 CTA"
      />
    </div>
  );
};
