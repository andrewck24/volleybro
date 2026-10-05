"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// PROTOTYPE: floating switcher for B1's query params (dev only).
// Keys: ←/→ header, [ / ] CTA layout, C curve.
type Opt = { key: string; name: string };
type RowDef = { param: string; label: string; opts: Opt[]; cur: string };

const Row = ({ row, onStep }: { row: RowDef; onStep: (d: number) => void }) => {
  const cur = row.opts.find((o) => o.key === row.cur)!;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="size-9 rounded-full"
        aria-label={`上一個 ${row.label}`}
      >
        &larr;
      </button>
      <span className="min-w-56 text-center whitespace-nowrap">
        {row.label} {cur.key} — {cur.name}
      </span>
      <button
        type="button"
        onClick={() => onStep(1)}
        className="size-9 rounded-full"
        aria-label={`下一個 ${row.label}`}
      >
        &rarr;
      </button>
    </div>
  );
};

export const PrototypeSwitcher = ({ rows }: { rows: RowDef[] }) => {
  const router = useRouter();
  const pathname = usePathname();

  const go = (r: number, d: number) => {
    const q = new URLSearchParams({ variant: "B1" });
    rows.forEach((row, i) => {
      const at = row.opts.findIndex((o) => o.key === row.cur);
      const next =
        i === r
          ? row.opts[(at + d + row.opts.length) % row.opts.length]!
          : row.opts[at]!;
      q.set(row.param, next.key);
    });
    router.replace(`${pathname}?${q}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(0, -1);
      if (e.key === "ArrowRight") go(0, 1);
      if (e.key === "[") go(1, -1);
      if (e.key === "]") go(1, 1);
      if (e.key === "c") go(2, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center rounded-3xl bg-foreground px-2 py-1 text-sm text-background shadow-lg">
      {rows.map((row, i) => (
        <Row key={row.param} row={row} onStep={(d) => go(i, d)} />
      ))}
    </div>
  );
};
