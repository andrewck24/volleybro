"use client";
import { STEPS } from "@/components/landing/copy";
import styles from "@/components/landing/steps.module.css";
import { useInView } from "@/hooks/use-in-view";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useEffect, useRef, type RefObject } from "react";

// The walkthrough's scroll behaviours, one hook per concern. Each takes the
// section element and finds its parts by their CSS-module classes.

const STEP_COUNT = STEPS.length;

// landscape phones get a static block: no pin, no snap, no dot
const useIsStaticLayout = () => useMediaQuery("(max-height: 500px)");

/** Whether the finger dot runs: it needs scroll-driven animation and motion. */
export const useIsFingerDotEnabled = () => {
  const isReducedMotion = useReducedMotion();
  const isStaticLayout = useIsStaticLayout();
  return (
    !isReducedMotion &&
    !isStaticLayout &&
    typeof CSS !== "undefined" &&
    CSS.supports("animation-timeline: view()")
  );
};

const useLatest = <T>(value: T) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
};

const part = (section: HTMLElement, className: string) =>
  section.querySelector<HTMLElement>(`.${className}`)!;

const setSnap = (isOn: boolean) =>
  document.documentElement.classList.toggle("landing-snap", isOn);

/**
 * Writes `data-step` on the section and calls `onStep` when a switch sentinel
 * crosses the viewport centre. The sentinels are the rails shifted up half a
 * header, so a step flips mid-way between two rest positions, where the
 * finger dot taps. It reports only real boundaries, never per frame.
 */
export const useStepObserver = (
  sectionRef: RefObject<HTMLElement | null>,
  onStep: (step: number) => void,
) => {
  const isStaticLayout = useIsStaticLayout();
  const latestOnStep = useLatest(onStep);

  useEffect(() => {
    const section = sectionRef.current!;
    if (isStaticLayout) latestOnStep.current(STEP_COUNT - 1);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const step = Number((entry.target as HTMLElement).dataset.s);
          section.dataset.step = String(step);
          latestOnStep.current(step);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    section.querySelectorAll("[data-s]").forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sectionRef, isStaticLayout, latestOnStep]);
};

const ENTER_ANIMATIONS_SETTLE_MS = 900;
// the app's panels slide in after every state change (tailwind-animate)
const SLIDE_SELECTOR = '[class*="slide-in-from"]';

/**
 * Places the finger dot. Its path is a CSS scroll-driven animation
 * (compositor; JS never runs per frame), and its tap targets are measured
 * live: tap 1 in the visible court, taps 2 and 3 in the hidden mirror panels
 * (record-demo.tsx), so the visible store is never touched to measure.
 * Re-measured on resize and after each slide-in; a missing target hides the
 * dot rather than send it to 0,0.
 */
export const useFingerDot = (
  sectionRef: RefObject<HTMLElement | null>,
  locate: ((tap: number, frame: HTMLElement) => Element | null) | undefined,
) => {
  const isEnabled = useIsFingerDotEnabled();
  const latestLocate = useLatest(locate);

  useEffect(() => {
    if (!isEnabled) return;
    const section = sectionRef.current!;
    const stage = part(section, styles.stage!);
    const frame = part(section, styles.frame!);
    const dotParts = [
      ...section.querySelectorAll<HTMLElement>(
        `.${styles.dot}, .${styles.dotCore}, .${styles.dotRing}`,
      ),
    ];
    let isCancelled = false;
    let placed = "";
    let pendingFrame = 0;

    const placeDot = () => {
      const locateTap = latestLocate.current;
      if (!locateTap) return;
      const stageBox = stage.getBoundingClientRect();
      // Off-tray points sit on the coral field beside the tray holding the
      // app cards, on (x, y)'s side and level with it, covering nothing.
      const tray = frame.firstElementChild!.getBoundingClientRect();
      const field = frame.parentElement!.getBoundingClientRect();
      const beside = ([x, y]: [number, number]): [number, number] => [
        x >= tray.left + tray.width / 2
          ? (tray.right + field.right) / 2
          : (tray.left + field.left) / 2,
        y,
      ];
      const taps: [number, number][] = [];
      for (let tap = 1; tap <= 3; tap++) {
        const box = locateTap(tap, frame)?.getBoundingClientRect();
        if (!box || !box.width) {
          delete section.dataset.dot;
          placed = "";
          return;
        }
        // taps land, and rest, a quarter in from the target's right edge:
        // on the target, clear of its centred label or number
        taps.push([box.left + box.width * 0.75, box.top + box.height / 2]);
      }
      // Start: off the tray, below it when the field has room there. The move
      // button tapped second leaves with its panel and the opponent moves
      // take its place, so that rest steps off the tray rather than onto
      // another button.
      const start: [number, number] =
        field.bottom - tray.bottom >= 24
          ? [tray.left + tray.width / 2, (tray.bottom + field.bottom) / 2]
          : beside(taps[0]!);
      const px = (v: number) => `${Math.round(v * 10) / 10}px`;
      const points = [start, ...taps].map(([x, y]) => [
        px(x - stageBox.left),
        px(y - stageBox.top),
      ]);
      const key = points.join();
      if (key === placed && "dot" in section.dataset) return;
      placed = key;
      points.forEach(([x, y], i) => {
        const name = i === 0 ? "start" : `tap-${i}`;
        stage.style.setProperty(`--finger-dot-${name}-x`, x!);
        stage.style.setProperty(`--finger-dot-${name}-y`, y!);
      });
      section.dataset.dot = "";
      // A running scroll-driven animation on the compositor keeps the keyframe
      // values it started with, var() included: restart it so the new targets
      // reach the compositor.
      for (const el of dotParts) {
        el.style.animationName = "none";
        void el.offsetWidth;
        el.style.animationName = "";
      }
    };
    const schedulePlace = () => {
      if (pendingFrame) return;
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = 0;
        placeDot();
      });
    };
    // first placement once the mirrors' own enter animations have settled
    void (async () => {
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      const finite = frame
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
      await Promise.race([
        Promise.all(finite.map((a) => a.finished.catch(() => {}))),
        new Promise((r) => setTimeout(r, ENTER_ANIMATIONS_SETTLE_MS)),
      ]);
      if (!isCancelled) placeDot();
    })();

    const observer = new ResizeObserver(schedulePlace);
    observer.observe(stage);
    observer.observe(frame);
    const onAnimationEnd = (e: AnimationEvent) => {
      if ((e.target as Element).matches(SLIDE_SELECTOR)) schedulePlace();
    };
    frame.addEventListener("animationend", onAnimationEnd);

    return () => {
      isCancelled = true;
      delete section.dataset.dot;
      cancelAnimationFrame(pendingFrame);
      observer.disconnect();
      frame.removeEventListener("animationend", onAnimationEnd);
    };
  }, [sectionRef, isEnabled, latestLocate]);
};

const WHEEL_THRESHOLD = 30;
const GESTURE_GAP_MS = 150;
const SCROLL_TIMEOUT_MS = 1000;
// smallest pixel delta that opens a gesture as a mouse notch (Chromium and
// Safari send ±100-120 per notch)
const NOTCH_OPENING_DELTA = 50;
// smallest delta that lets a settled notch start the next step without the
// burst lock having cleared
const NOTCH_REPEAT_DELTA = 80;
const NOTCH_REPEAT_GAP_MS = 250;
const NAVIGATION_KEYS = ["PageDown", "PageUp", "End", "Home", " ", "Tab"];

/**
 * Mouse wheel vs trackpad, judged once per gesture (its first event after
 * GESTURE_GAP_MS of quiet): a wheel notch arrives in line/page units (Firefox)
 * or as one large, purely vertical pixel delta; a trackpad gesture opens with
 * small pixel deltas and usually some deltaX. Touch and keyboard send no wheel
 * events at all, so they always scroll plainly.
 * A hard trackpad flick can open at 50px or more; it then steps once, as the
 * burst lock keeps it to one step.
 */
const isWheelNotch = (e: WheelEvent) =>
  e.deltaMode !== 0 ||
  (e.deltaX === 0 && Math.abs(e.deltaY) >= NOTCH_OPENING_DELTA);

/**
 * Mandatory snap, wheelstep and keys for the pinned section.
 *
 * Snap is on `<html>` only while the section top is under the header and its
 * bottom still fills the viewport, so the rest of the page scrolls freely and
 * leaving past the first or last step is never pulled back. A wheel notch
 * scrolls natively and smoothly to the next step (a snap point, so snap never
 * pulls it back); anything else scrolls natively and snap settles it on a
 * step. Keyboard scrolling computes its destination up front, so snap would
 * pull a PageDown past the last step back onto it: snap is dropped for those
 * keys.
 */
export const useWheelStep = (sectionRef: RefObject<HTMLElement | null>) => {
  const isStaticLayout = useIsStaticLayout();
  const isReducedMotion = useReducedMotion();
  const isOnScreen = useInView(sectionRef);

  useEffect(() => {
    if (isStaticLayout) return;
    const section = sectionRef.current!;
    const head = parseFloat(getComputedStyle(part(section, styles.stage!)).top);
    const syncSnap = () => {
      const box = section.getBoundingClientRect();
      setSnap(box.top <= head + 1 && box.bottom >= window.innerHeight - 1);
    };
    syncSnap();
    const onKey = (e: KeyboardEvent) => {
      if (!NAVIGATION_KEYS.includes(e.key)) return;
      const step = Number(section.dataset.step);
      const isDown = !(e.key === "PageUp" || e.key === "Home" || e.shiftKey);
      // inside the steps, PageDown / PageUp still land on a step position
      const isLeaving =
        e.key === "End" ||
        e.key === "Home" ||
        e.key === "Tab" ||
        (isDown ? step >= STEP_COUNT - 1 : step <= 0) ||
        section.getBoundingClientRect().top > head + 1;
      if (isLeaving) setSnap(false);
    };
    window.addEventListener("scroll", syncSnap, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", syncSnap);
      window.removeEventListener("keydown", onKey);
      setSnap(false);
    };
  }, [sectionRef, isStaticLayout]);

  useEffect(() => {
    if (isStaticLayout || !isOnScreen) return;
    const section = sectionRef.current!;
    const stage = part(section, styles.stage!);
    let mode: "step" | "scrub" | null = null;
    let accumulated = 0;
    let isLocked = false;
    let isBusy = false;
    let lastFire = 0;
    // read once per gesture, not per wheel event
    let measured: { track: number; base: number } | null = null;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let busyTimer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      isBusy = false;
      clearTimeout(busyTimer);
    };
    const measure = () => ({
      // every step track is one stage tall
      track: stage.offsetHeight,
      // step i rests with the section top tucked under the header
      base:
        section.getBoundingClientRect().top +
        window.scrollY -
        parseFloat(getComputedStyle(stage).top),
    });

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0) return;
      clearTimeout(gapTimer);
      gapTimer = setTimeout(() => {
        mode = null;
        isLocked = false;
        accumulated = 0;
        measured = null;
      }, GESTURE_GAP_MS);
      mode ??= isWheelNotch(e) ? "step" : "scrub";
      if (mode === "scrub") return;

      const { track, base } = (measured ??= measure());
      const direction = e.deltaY > 0 ? 1 : -1;
      const step = Number(section.dataset.step);
      // off the step position (entering, or after touch/keyboard): settle on
      // the current step in the wheel's direction before moving on
      const offset = window.scrollY - (base + step * track);
      const next =
        direction > 0
          ? offset < -2
            ? step
            : step + 1
          : offset > 2
            ? step
            : step - 1;
      // first/last step: let the gesture through so the page scrolls out,
      // with snap off first so the notch is not pulled back onto the step
      if (next < 0 || next >= STEP_COUNT) {
        setSnap(false);
        return;
      }
      e.preventDefault();
      // a trackpad's inertial tail is many small deltas; a mouse notch is one
      // big delta, so a settled big notch may start the next step without a pause
      const isNewNotch =
        !isBusy &&
        Math.abs(e.deltaY) >= NOTCH_REPEAT_DELTA &&
        e.timeStamp - lastFire > NOTCH_REPEAT_GAP_MS;
      if ((isLocked && !isNewNotch) || isBusy) return;
      accumulated += e.deltaY;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;
      isLocked = true;
      isBusy = true;
      lastFire = e.timeStamp;
      accumulated = 0;
      window.scrollTo({
        top: base + next * track,
        behavior: isReducedMotion ? "auto" : "smooth",
      });
      busyTimer = setTimeout(done, SCROLL_TIMEOUT_MS);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scrollend", done);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scrollend", done);
      clearTimeout(gapTimer);
      clearTimeout(busyTimer);
    };
  }, [sectionRef, isStaticLayout, isOnScreen, isReducedMotion]);
};

// the step chip's centre below the captions' top at lg: half its 6rem height,
// the same 3rem the dashed attack-line extension sits at in steps.module.css
const STEP_CHIP_CENTER_PX = 48;
// below lg the captions sit above the field, so the line takes the court's own place on it
const FIELD_ATTACK_LINE_RATIO = 0.3;

/** Measures where the field's attack line goes: level with the step chip at lg. */
export const useAttackLine = (sectionRef: RefObject<HTMLElement | null>) => {
  const isWide = useMediaQuery("(min-width: 64rem)");

  useEffect(() => {
    const section = sectionRef.current!;
    const field = part(section, styles.field!);
    const captions = part(section, styles.captions!);
    const placeLine = () => {
      const fieldBox = field.getBoundingClientRect();
      const y = isWide
        ? captions.getBoundingClientRect().top -
          fieldBox.top +
          STEP_CHIP_CENTER_PX
        : fieldBox.height * FIELD_ATTACK_LINE_RATIO;
      field.style.setProperty("--walkthrough-attack-line-y", `${y}px`);
    };
    placeLine();
    const observer = new ResizeObserver(placeLine);
    observer.observe(field);
    observer.observe(captions);
    return () => observer.disconnect();
  }, [sectionRef, isWide]);
};
