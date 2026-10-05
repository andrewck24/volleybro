"use client";
// PROTOTYPE (throwaway). Section 3's pinned part: sticky frame + scrub layers
// (CSS only) + step-boundary callback. It owns no demo state: `onStep(i)` is
// the only thing that touches the components, and it fires from an
// IntersectionObserver when a rail crosses the viewport centre, never per
// frame. The stage sticks under the fixed header (top: --header-h) and every
// step track is one stage tall, so the header never covers the frame.
import styles from "@/components/landing/prototype-v1/record-demo.module.css";
import { STEPS } from "@/components/landing/prototype-v1/shared";
import { cn } from "@/lib/utils";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const N = STEPS.length;
const vars = (vals: number[]) =>
  Object.fromEntries(vals.map((v, i) => [`--v${i}`, v])) as CSSProperties;

const WHEEL_THRESHOLD = 30;
const MOUSE_NOTCH = 80;
const GESTURE_GAP_MS = 150;
const SCROLL_TIMEOUT_MS = 1000;

/**
 * Mouse wheel vs trackpad, judged once per gesture (its first event after
 * GESTURE_GAP_MS of quiet): a wheel notch arrives in line/page units
 * (Firefox) or as one large, purely vertical pixel delta (Chromium/Safari send
 * ±100-120 per notch); a trackpad gesture opens with small pixel deltas and
 * usually some deltaX. Touch and keyboard send no wheel events at all, so they
 * always get the plain scrub.
 * ponytail: heuristic — a hard trackpad flick can open at ≥50px (it then steps
 * once; the burst lock keeps it to one step), and a macOS mouse that sends
 * small smoothed deltas scrubs. Upgrade: remember the verdict per device.
 */
const isWheelNotch = (e: WheelEvent) =>
  e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50);

const Numeral = ({ i, className }: { i: number; className?: string }) => {
  const last = i === N - 1;
  return (
    <span
      className={cn(
        "shrink-0 leading-none font-black tabular-nums",
        last ? "text-chart-2" : "text-chart-1",
        className,
      )}
    >
      {last ? "✓" : `0${i + 1}`}
    </span>
  );
};

// DECIDE: record-demo's thin progress bar under the frame is dropped in favour
// of B1's 「步驟 n / 4」 caption line; restore it if the bar read better.
export const StepsSection = ({
  onStep,
  children,
}: {
  onStep: (step: number) => void;
  children: ReactNode;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  });

  useEffect(() => {
    const section = box.current!;
    const stage = section.querySelector<HTMLElement>(`.${styles.stage}`)!;
    const staticMq = window.matchMedia("(max-height: 500px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // landscape phones: no pin, no scrub — show the finished rally
    if (staticMq.matches) onStepRef.current(N - 1);

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

    // wheelstep: one mouse-wheel gesture = one native smooth scroll to the next
    // step; anything else scrubs freely. No CSS scroll snap in any mode.
    let mode: "step" | "scrub" | null = null;
    let acc = 0;
    let locked = false;
    let busy = false;
    let lastFire = 0;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let busyTimer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      busy = false;
      clearTimeout(busyTimer);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0) return;
      clearTimeout(gapTimer);
      gapTimer = setTimeout(() => {
        mode = null;
        locked = false;
        acc = 0;
      }, GESTURE_GAP_MS);
      mode ??= isWheelNotch(e) ? "step" : "scrub";
      if (mode === "scrub") return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const track =
        section.querySelector<HTMLElement>("[data-i]")!.offsetHeight;
      // step i rests with the section top tucked under the header
      const base =
        section.getBoundingClientRect().top +
        window.scrollY -
        parseFloat(getComputedStyle(stage).top);
      const step = Number(section.dataset.step);
      // off the step position (entering, or after touch/keyboard): settle on
      // the current step in the wheel's direction before moving on
      const off = window.scrollY - (base + step * track);
      const next =
        dir > 0 ? (off < -2 ? step : step + 1) : off > 2 ? step : step - 1;
      // first/last step: let the gesture through so the page scrolls out
      if (next < 0 || next >= N) return;
      e.preventDefault();
      // a trackpad's inertial tail is many small deltas; a mouse notch is one
      // big delta, so a settled big notch may start the next step without a pause
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
        top: base + next * track,
        behavior: reduced.matches ? "auto" : "smooth",
      });
      busyTimer = setTimeout(done, SCROLL_TIMEOUT_MS);
    };

    // wheel listeners exist only while the section is on screen
    const off = () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scrollend", done);
    };
    const modeIO = new IntersectionObserver(([e]) => {
      if (e!.isIntersecting && !staticMq.matches) {
        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("scrollend", done);
      } else off();
    });
    modeIO.observe(section);

    return () => {
      stepIO.disconnect();
      modeIO.disconnect();
      off();
      clearTimeout(gapTimer);
      clearTimeout(busyTimer);
    };
  }, []);

  return (
    <div ref={box} data-step="0" className={cn(styles.section, "v1-steps-h")}>
      <div className={styles.stage}>
        <div aria-hidden className={styles.captions}>
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                styles.caption,
                styles.layer,
                "flex gap-4 lg:gap-6",
              )}
              style={vars(STEPS.map((_, j) => (i === j ? 1 : 0)))}
            >
              <Numeral i={i} className="text-5xl lg:text-8xl" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold tracking-widest text-muted-foreground">
                  步驟 {i + 1} / {N}
                </p>
                <h3 className="text-xl font-black lg:text-3xl">{s.title}</h3>
                <p className="text-sm text-muted-foreground lg:text-lg">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        <ol className="sr-only">
          {STEPS.map((s) => (
            <li key={s.title}>
              {s.title}：{s.body}
            </li>
          ))}
        </ol>
        {/* watch-only: inert drops pointer, focus and the a11y tree; the
            sr-only list above carries the content for screen readers */}
        <div inert className={cn(styles.frame, "overflow-hidden rounded-xl")}>
          {children}
        </div>
      </div>
      <div className={styles.rails}>
        {STEPS.map((s, i) => (
          <div key={s.title} data-i={i} className={styles.rail} />
        ))}
      </div>
    </div>
  );
};
