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

export type SnapMode = "mandatory" | "none" | "proximity" | "wheelstep";

// proximity uses shorter step tracks so its pull zone is reachable by a wheel
const TRACK: Record<SnapMode, string> = {
  mandatory: "100svh",
  none: "100svh",
  proximity: "60svh",
  wheelstep: "100svh",
};
const WHEEL_THRESHOLD = 30;
const MOUSE_NOTCH = 80;
const GESTURE_GAP_MS = 150;
const SCROLL_TIMEOUT_MS = 1000;

export const StepsSection = ({
  onStep,
  snap = "mandatory",
  children,
}: {
  onStep: (step: number) => void;
  snap?: SnapMode;
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

    // wheelstep: one wheel gesture = one native smooth scroll to the next step
    // top. The non-passive listener exists only while the section is on screen.
    let acc = 0;
    let locked = false;
    let busy = false;
    let lastFire = 0;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let busyTimer: ReturnType<typeof setTimeout> | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const done = () => {
      busy = false;
      clearTimeout(busyTimer);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const track =
        section.querySelector<HTMLElement>("[data-i]")!.offsetHeight;
      const top = section.getBoundingClientRect().top + window.scrollY;
      const step = Number(section.dataset.step);
      // off the step top (entering, or after touch/keyboard): settle on the
      // current step in the wheel's direction before moving on
      const off = window.scrollY - (top + step * track);
      const next =
        dir > 0 ? (off < -2 ? step : step + 1) : off > 2 ? step : step - 1;
      // first/last step: let the gesture through so the page scrolls out
      if (next < 0 || next >= STEPS.length) return;
      e.preventDefault();
      clearTimeout(gapTimer);
      gapTimer = setTimeout(() => {
        locked = false;
        acc = 0;
      }, GESTURE_GAP_MS);
      // a trackpad's inertial tail is many small deltas; a mouse notch is one big
      // delta, so a settled big notch may start the next step without a pause
      const mouseNotch =
        !busy &&
        Math.abs(e.deltaY) >= MOUSE_NOTCH &&
        e.timeStamp - lastFire > 250;
      if ((locked && !mouseNotch) || busy) return;
      acc += e.deltaY;
      if (Math.abs(acc) < WHEEL_THRESHOLD) return;
      locked = true;
      busy = true;
      lastFire = e.timeStamp;
      acc = 0;
      window.scrollTo({
        top: top + next * track,
        behavior: reduced.matches ? "auto" : "smooth",
      });
      busyTimer = setTimeout(done, SCROLL_TIMEOUT_MS);
    };

    // scroll-snap / wheel handling only while the section is on screen
    const modeIO = new IntersectionObserver(([e]) => {
      const on = e!.isIntersecting;
      if (snap === "mandatory" || snap === "proximity")
        root.style.scrollSnapType = on ? `y ${snap}` : "";
      if (snap === "wheelstep") {
        if (on) window.addEventListener("wheel", onWheel, { passive: false });
        else window.removeEventListener("wheel", onWheel);
      }
    });
    modeIO.observe(section);
    window.addEventListener("scrollend", done);

    return () => {
      stepIO.disconnect();
      modeIO.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scrollend", done);
      clearTimeout(gapTimer);
      clearTimeout(busyTimer);
      root.style.scrollSnapType = "";
    };
  }, [snap]);

  return (
    <section
      ref={box}
      data-step="0"
      data-snap={snap}
      className={styles.section}
      style={{ "--track": TRACK[snap] } as CSSProperties}
    >
      <div aria-hidden className={styles.snapBefore} />
      <div className={styles.stage}>
        {/* watch-only: inert drops pointer, focus and the a11y tree; the
            sr-only list below carries the content for screen readers */}
        <div inert className={`${styles.frame} overflow-hidden rounded-xl`}>
          {children}
        </div>
        <ol className="sr-only">
          {STEPS.map((s) => (
            <li key={s.title}>
              {s.title}：{s.body}
            </li>
          ))}
        </ol>
        <div aria-hidden className={styles.captions}>
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
