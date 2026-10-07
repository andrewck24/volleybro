"use client";
// The walkthrough's demo code (real recording components,
// demo store, SWR cache) loads only once the placeholder is within one
// viewport of the screen, so the first load ships none of it. The section
// intro (server-rendered `intro`) lives in the sticky stage; the placeholder
// and the loading fallback render it in the same stage column, with the
// loaded block's exact height (`.landing-walkthrough-height`), so loading never shifts the
// page and the heading is in the HTML before any JS runs.
import styles from "@/components/landing/steps.module.css";
import { cn } from "@/lib/utils";
import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

const RecordDemo = lazy(() =>
  import("@/components/landing/record-demo").then((m) => ({
    default: m.RecordDemo,
  })),
);

const Placeholder = ({
  intro,
  ref,
}: {
  intro: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) => (
  <div ref={ref} className={cn(styles.section, "landing-walkthrough-height")}>
    <div className={styles.stage}>
      <div className={styles.lead}>{intro}</div>
    </div>
  </div>
);

export const LazyRecordDemo = ({ intro }: { intro: ReactNode }) => {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e!.isIntersecting) setNear(true);
      },
      // one viewport of lead: in practice the chunk arrives just after
      // hydration — out of first-load JS, not deferred until scroll
      { rootMargin: "100% 0px" },
    );
    io.observe(box.current!);
    return () => io.disconnect();
  }, [near]);

  return near ? (
    <Suspense fallback={<Placeholder intro={intro} />}>
      <RecordDemo intro={intro} />
    </Suspense>
  ) : (
    <Placeholder ref={box} intro={intro} />
  );
};
