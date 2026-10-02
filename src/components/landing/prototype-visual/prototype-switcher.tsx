"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// PROTOTYPE: floating ?variant= switcher (dev only)
export const PrototypeSwitcher = ({
  variants,
  current,
}: {
  variants: { key: string; name: string }[];
  current: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const idx = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  const go = (d: number) => {
    const next = variants[(idx + d + variants.length) % variants.length]!;
    router.replace(`${pathname}?variant=${next.key}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground px-2 py-1.5 text-sm text-background shadow-lg">
      <button
        type="button"
        onClick={() => go(-1)}
        className="size-9 rounded-full"
        aria-label="上一個變體"
      >
        &larr;
      </button>
      <span className="min-w-44 text-center whitespace-nowrap">
        {variants[idx]!.key} — {variants[idx]!.name}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="size-9 rounded-full"
        aria-label="下一個變體"
      >
        &rarr;
      </button>
    </div>
  );
};
