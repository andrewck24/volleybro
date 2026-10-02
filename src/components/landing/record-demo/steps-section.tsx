"use client";
// PROTOTYPE (throwaway). Section 3 shell: sticky frame + scrub layers (CSS
// only) + step-boundary callback. It owns no demo state: `onStep(i)` is the
// only thing that touches the components, and it fires from an
// IntersectionObserver when a rail crosses the viewport centre, never per frame.
import styles from "@/components/landing/record-demo/record-demo.module.css";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export const STEPS = [
  { title: "選球員", body: "點場上的球員，決定這一球是誰的。" },
  { title: "我方動作", body: "從動作面板挑一個：發球、攻擊、攔網……" },
  { title: "對方回應", body: "面板換成對方的結果，再點一次。" },
  { title: "預覽送出", body: "確認這一球的摘要，送出即記錄完成。" },
];

const vars = (vals: number[]) =>
  Object.fromEntries(vals.map((v, i) => [`--v${i}`, v])) as CSSProperties;

export const StepsSection = ({
  onStep,
  children,
}: {
  onStep: (step: number) => void;
  children: ReactNode;
}) => {
  const box = useRef<HTMLElement>(null);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  });

  useEffect(() => {
    const section = box.current!;
    const root = document.documentElement;

    // step boundary: a rail crossing the viewport centre line. IO only reports
    // changes, so every callback is a real boundary (including re-entry).
    const stepIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.i);
          section.dataset.step = String(i);
          onStepRef.current(i);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    section.querySelectorAll("[data-i]").forEach((n) => stepIO.observe(n));

    // mandatory snap only while the section is on screen
    const snapIO = new IntersectionObserver(([e]) => {
      root.style.scrollSnapType = e!.isIntersecting ? "y mandatory" : "";
    });
    snapIO.observe(section);

    return () => {
      stepIO.disconnect();
      snapIO.disconnect();
      root.style.scrollSnapType = "";
    };
  }, []);

  return (
    <section ref={box} data-step="0" className={styles.section}>
      <div aria-hidden className={styles.snapBefore} />
      <div className={styles.stage}>
        <div className={`${styles.frame} overflow-hidden rounded-xl`}>
          {children}
        </div>
        <div className={styles.captions}>
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={`${styles.caption} ${styles.layer}`}
              style={vars(STEPS.map((_, j) => (i === j ? 1 : 0)))}
            >
              <p className="text-xs text-muted-foreground">
                {i + 1} / {STEPS.length}
              </p>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
        <div aria-hidden className={styles.progress}>
          <div
            className={`${styles.bar} ${styles.layer} ${styles.scale}`}
            style={vars([0.25, 0.5, 0.75, 1])}
          />
        </div>
      </div>
      <div className={styles.rails}>
        {STEPS.map((s, i) => (
          <div key={s.title} data-i={i} className={styles.rail} />
        ))}
      </div>
      <div aria-hidden className={styles.snapAfter} />
    </section>
  );
};
