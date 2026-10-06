"use client";
// PROTOTYPE (throwaway). Copied from prototype-v1 with its mechanics intact
// (wheelstep / pure scroll-driven scrub, no CSS snap, inert frame + sr-only
// steps, header offset). Layers: the step numeral and the app frame are
// objects (card surface, rounded, shadow); the dashed attack-line extension
// behind them is court. Section 3's pinned part: sticky frame + scrub layers
// (CSS only) + step-boundary callback. It owns no demo state: `onStep(i)` is
// the only thing that touches the components, and it fires from an
// IntersectionObserver when a rail crosses the viewport centre, never per
// frame. The stage sticks under the fixed header (top: --header-h) and every
// step track is one stage tall, so the header never covers the frame.
import styles from "@/components/landing/prototype-v2/steps.module.css";
import { STEPS } from "@/components/landing/prototype-v2/copy";
import { cn } from "@/lib/utils";
import { RiSendPlaneLine } from "react-icons/ri";
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

const Numeral = ({ i }: { i: number }) => (
  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-card text-3xl leading-none font-bold text-primary tabular-nums shadow-md lg:size-24 lg:rounded-2xl lg:text-6xl dark:text-chart-1">
    {i === N - 1 ? <RiSendPlaneLine className="size-[0.85em]" /> : i + 1}
  </span>
);

export const StepsSection = ({
  intro,
  onStep,
  children,
}: {
  /** the section heading + lead, set in the sticky stage above the steps */
  intro: ReactNode;
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

    // v2: mandatory snap while the stage is pinned, so touch / trackpad never
    // rest between steps. The snap points are the rails (scroll-snap-align
    // start under scroll-padding-top = header); the class lives on <html>
    // only while the section top is under the header and its bottom still
    // fills the viewport, so the rest of the page scrolls freely and leaving
    // past the first or last step is never pulled back.
    const root = document.documentElement;
    const setSnap = (on: boolean) => root.classList.toggle("v2-snap", on);
    const syncSnap = () => {
      if (staticMq.matches) return setSnap(false);
      const r = section.getBoundingClientRect();
      const head = parseFloat(getComputedStyle(stage).top);
      setSnap(r.top <= head + 1 && r.bottom >= window.innerHeight - 1);
    };
    syncSnap();
    window.addEventListener("scroll", syncSnap, { passive: true });

    // the field's attack line sits at the step chip's centre (where the
    // captions' dashed extension meets the court): measured, not guessed
    const field = section.querySelector<HTMLElement>(`.${styles.field}`)!;
    const captions = section.querySelector<HTMLElement>(`.${styles.captions}`)!;
    const wide = window.matchMedia("(min-width: 64rem)");
    const placeLine = () => {
      const f = field.getBoundingClientRect();
      const c = captions.getBoundingClientRect();
      // the field is 9 m wide: a metre is a ninth of it
      field.style.setProperty("--w9", `${f.width}px`);
      // lg: level with the step chip; below lg the captions sit above the
      // field, so the attack line takes the court's own place on it
      const y = wide.matches ? c.top - f.top + 48 : f.height * 0.3;
      field.style.setProperty("--line-y", `${y}px`);
    };
    placeLine();
    const ro = new ResizeObserver(placeLine);
    ro.observe(field);
    ro.observe(captions);
    // keyboard scrolling (and Tab focus jumps) compute their destination up
    // front, so snap would pull a PageDown past the last step back onto it:
    // drop snap for the key's scroll, re-sync once it settles
    const KEYS = ["PageDown", "PageUp", "End", "Home", " ", "Tab"];
    const onKey = (e: KeyboardEvent) => {
      if (!KEYS.includes(e.key)) return;
      const r = section.getBoundingClientRect();
      const head = parseFloat(getComputedStyle(stage).top);
      const step = Number(section.dataset.step);
      const down = !(e.key === "PageUp" || e.key === "Home" || e.shiftKey);
      // inside the steps, PageDown / PageUp still land on a step position
      const leaving =
        e.key === "End" ||
        e.key === "Home" ||
        e.key === "Tab" ||
        (down ? step >= N - 1 : step <= 0) ||
        r.top > head + 1;
      if (leaving) setSnap(false);
    };
    window.addEventListener("keydown", onKey);

    // wheelstep: one mouse-wheel gesture = one native smooth scroll to the next
    // step (= the next snap point, so snap never pulls it back); anything else
    // scrolls natively and the snap settles it on a step.
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
      // first/last step: let the gesture through so the page scrolls out,
      // with snap off first so the notch is not pulled back onto the step
      if (next < 0 || next >= N) {
        setSnap(false);
        return;
      }
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
      window.removeEventListener("scroll", syncSnap);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      setSnap(false);
      clearTimeout(gapTimer);
      clearTimeout(busyTimer);
    };
  }, []);

  return (
    <div ref={box} data-step="0" className={cn(styles.section, "v2-steps-h")}>
      <div className={styles.stage}>
        <div className={styles.lead}>
          {intro}
          <div aria-hidden className={styles.captions}>
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={cn(
                  styles.caption,
                  styles.layer,
                  "flex gap-4 lg:gap-8",
                )}
                style={vars(STEPS.map((_, j) => (i === j ? 1 : 0)))}
              >
                <Numeral i={i} />
                <div className="flex flex-col gap-1 lg:gap-2">
                  <h3 className="text-xl font-bold lg:text-4xl">{s.title}</h3>
                  <p className="text-base text-balance text-(--v2-on-free-2) lg:text-xl">
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
        {/* watch-only: inert drops pointer, focus and the a11y tree; the
            sr-only list above carries the content for screen readers */}
        {/* court layer: an in-court field (coral, white side lines) the app
            frame stands on; the frame is the object on it */}
        <div className={styles.field}>
          <div inert className={cn(styles.frame, "text-foreground")}>
            {children}
          </div>
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
