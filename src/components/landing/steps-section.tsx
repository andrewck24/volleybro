"use client";
import { STEPS } from "@/components/landing/copy";
import styles from "@/components/landing/steps.module.css";
import {
  useAttackLine,
  useFingerDot,
  useStepObserver,
  useWheelStep,
} from "@/components/landing/use-walkthrough";
import { cn } from "@/lib/utils";
import { useRef, type ReactNode } from "react";
import { RiSendPlaneLine } from "react-icons/ri";

const Numeral = ({ i }: { i: number }) => (
  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-card text-3xl leading-none font-bold text-primary tabular-nums shadow-md lg:size-24 lg:rounded-2xl lg:text-6xl dark:text-chart-1">
    {i === STEPS.length - 1 ? (
      <RiSendPlaneLine className="size-[0.85em]" />
    ) : (
      i + 1
    )}
  </span>
);

/**
 * The walkthrough's pinned part: a sticky stage (intro, captions, the app
 * frame on a court field, the finger dot) over four step tracks. It owns no
 * demo state: `onStep` is the only thing that touches the components.
 */
export const StepsSection = ({
  intro,
  onStep,
  locate,
  children,
}: {
  /** the section heading + lead, set in the sticky stage above the steps */
  intro: ReactNode;
  onStep: (step: number) => void;
  /** the element tap `t` (1..3) lands on, found in the frame's current DOM */
  locate?: (tap: number, frame: HTMLElement) => Element | null;
  children: ReactNode;
}) => {
  const box = useRef<HTMLDivElement>(null);
  useStepObserver(box, onStep);
  useFingerDot(box, locate);
  useWheelStep(box);
  useAttackLine(box);

  return (
    <div ref={box} data-step="0" className={styles.section}>
      <div className={styles.stage}>
        <div className={styles.lead}>
          {intro}
          <div aria-hidden className={styles.captions}>
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={cn(styles.caption, "flex gap-4 lg:gap-8")}
              >
                <Numeral i={i} />
                <div className="flex flex-col gap-1 lg:gap-2">
                  <h3 className="text-xl font-bold lg:text-4xl">{s.title}</h3>
                  <p className="text-base text-balance text-(--free-zone-muted-foreground) lg:text-xl">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ol className="sr-only">
          {STEPS.map((s) => (
            <li key={s.title}>
              {s.title}：{s.body}
            </li>
          ))}
        </ol>
        {/* inert drops pointer, focus and the a11y tree; the sr-only list
            above carries the content for screen readers */}
        <div className={styles.field}>
          <div inert className={cn(styles.frame, "text-foreground")}>
            {children}
          </div>
        </div>
        <div aria-hidden className={styles.dot}>
          <span className={styles.dotRing} />
          <span className={styles.dotCore} />
        </div>
      </div>
      <div className={styles.rails}>
        {STEPS.map((s) => (
          <div key={s.title} className={styles.rail} />
        ))}
      </div>
      <div className={styles.switches}>
        {STEPS.map((s, i) => (
          <div key={s.title} data-s={i} className={styles.rail} />
        ))}
      </div>
    </div>
  );
};
