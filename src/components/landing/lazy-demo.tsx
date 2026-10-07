"use client";
import styles from "@/components/landing/steps.module.css";
import { useInView } from "@/hooks/use-in-view";
import { Suspense, lazy, useRef, type ReactNode, type Ref } from "react";

const RecordDemo = lazy(() =>
  import("@/components/landing/record-demo").then((m) => ({
    default: m.RecordDemo,
  })),
);

// The placeholder and the loaded section share the stage column and height, so
// loading never shifts the page and the intro is in the HTML before any JS.
const Placeholder = ({
  intro,
  ref,
}: {
  intro: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) => (
  <div ref={ref} className={styles.section}>
    <div className={styles.stage}>
      <div className={styles.lead}>{intro}</div>
    </div>
  </div>
);

/** Loads the demo code once the placeholder is within a viewport of the screen. */
export const LazyRecordDemo = ({ intro }: { intro: ReactNode }) => {
  const placeholder = useRef<HTMLDivElement>(null);
  const isNear = useInView(placeholder, { rootMargin: "100% 0px", once: true });

  return isNear ? (
    <Suspense fallback={<Placeholder intro={intro} />}>
      <RecordDemo intro={intro} />
    </Suspense>
  ) : (
    <Placeholder ref={placeholder} intro={intro} />
  );
};
