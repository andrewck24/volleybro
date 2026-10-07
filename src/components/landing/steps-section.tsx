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

const Numeral = ({ index }: { index: number }) => (
  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-card text-3xl leading-none font-bold text-primary tabular-nums shadow-md lg:size-24 lg:rounded-2xl lg:text-6xl dark:text-chart-1">
    {index === STEPS.length - 1 ? (
      <RiSendPlaneLine className="size-[0.85em]" />
    ) : (
      index + 1
    )}
  </span>
);

/** The pinned walkthrough. It owns no demo state: `onStep` alone touches the components. */
export const StepsSection = ({
  intro,
  onStep,
  locate,
  children,
}: {
  intro: ReactNode;
  onStep: (step: number) => void;
  locate?: (tap: number, frame: HTMLElement) => Element | null;
  children: ReactNode;
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  useStepObserver(sectionRef, onStep);
  useFingerDot(sectionRef, locate);
  useWheelStep(sectionRef);
  useAttackLine(sectionRef);

  return (
    <div ref={sectionRef} data-step="0" className={styles.section}>
      <div className={styles.stage}>
        <div className={styles.introColumn}>
          {intro}
          <div aria-hidden className={styles.captions}>
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className={cn(styles.caption, "flex gap-4 lg:gap-8")}
              >
                <Numeral index={index} />
                <div className="flex flex-col gap-1 lg:gap-2">
                  <h3 className="text-xl font-bold lg:text-4xl">
                    {step.title}
                  </h3>
                  <p className="text-base text-balance text-(--free-zone-muted-foreground) lg:text-xl">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ol className="sr-only">
          {STEPS.map((step) => (
            <li key={step.title}>
              {step.title}：{step.body}
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
        <div aria-hidden className={styles.fingerDot}>
          <span className={styles.fingerDotRing} />
          <span className={styles.fingerDotCore} />
        </div>
      </div>
      <div className={styles.stepRails}>
        {STEPS.map((step) => (
          <div key={step.title} className={styles.stepRail} />
        ))}
      </div>
      <div className={styles.stepSwitches}>
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            data-step-switch={index}
            className={styles.stepRail}
          />
        ))}
      </div>
    </div>
  );
};
