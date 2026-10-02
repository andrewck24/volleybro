"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// PROTOTYPE: floating ?variant= switcher (dev only)
export const PrototypeSwitcher = ({
  variants,
}: {
  variants: { key: string; name: string }[];
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const idx = Math.max(
    0,
    variants.findIndex((v) => v.key === params.get("variant")),
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
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-foreground px-3 py-2 text-sm text-background shadow-lg">
      <button type="button" onClick={() => go(-1)} className="px-2">
        &larr;
      </button>
      <span className="min-w-40 text-center">
        {variants[idx]!.key} — {variants[idx]!.name}
      </span>
      <button type="button" onClick={() => go(1)} className="px-2">
        &rarr;
      </button>
    </div>
  );
};
