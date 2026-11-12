"use client";
import styles from "@/components/landing/steps.module.css";
import { useInView } from "@/hooks/use-in-view";
import { Suspense, lazy, useRef, type ReactNode, type Ref } from "react";

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
  <div ref={ref} data-testid="lazy-demo-placeholder" className={styles.section}>
    <div data-testid="lazy-demo-stage" className={styles.stage}>
      <div className={styles.introColumn}>{intro}</div>
    </div>
  </div>
);

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
