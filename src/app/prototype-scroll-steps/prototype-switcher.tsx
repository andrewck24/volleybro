"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: Record<string, string>;
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const keys = Object.keys(variants);

  const go = useCallback(
    (d: number) => {
      const next =
        keys[(keys.indexOf(current) + d + keys.length) % keys.length];
      router.replace(`${pathname}?variant=${next}`, { scroll: false });
    },
    [keys, current, router, pathname],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
      <button type="button" aria-label="prev" onClick={() => go(-1)}>
        ←
      </button>
      <span className="whitespace-nowrap">
        {current} — {variants[current]}
      </span>
      <button type="button" aria-label="next" onClick={() => go(1)}>
        →
      </button>
    </div>
  );
}
