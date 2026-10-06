"use client";
// PROTOTYPE (throwaway). Sections 3-4's demo code (real recording components,
// demo store, SWR cache) sits behind next/dynamic and only loads once the
// placeholder is within one viewport of the screen, so the first load ships
// none of it. The placeholder has the loaded block's exact height
// (`.v2-steps-h`), so loading never shifts the page.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const RecordDemo = dynamic(
  () =>
    import("@/components/landing/prototype-v2/record-demo").then(
      (m) => m.RecordDemo,
    ),
  { ssr: false, loading: () => <div aria-hidden className="v2-steps-h" /> },
);

export const LazyRecordDemo = () => {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e!.isIntersecting) setNear(true);
      },
      // DECIDE: one viewport of lead (record-demo's value). Section 3 starts
      // right under the hero, so in practice this fetches the chunk just
      // after hydration on both 1440 and 390 widths — out of first-load JS,
      // but not deferred until scroll. A smaller margin defers it further.
      { rootMargin: "100% 0px" },
    );
    io.observe(box.current!);
    return () => io.disconnect();
  }, []);

  return near ? (
    <RecordDemo />
  ) : (
    <div ref={box} aria-hidden className="v2-steps-h" />
  );
};
