"use client";
import { STEPS } from "@/components/landing/copy";
import styles from "@/components/landing/steps.module.css";
import { useInView } from "@/hooks/use-in-view";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useEffect, useRef, type RefObject } from "react";

const STEP_COUNT = STEPS.length;

// landscape phones get a static block: no pin, no snap, no dot
const useIsStaticLayout = () => useMediaQuery("(max-height: 500px)");

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
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  return latest;
};

const findPart = (section: HTMLElement, className: string) =>
  section.querySelector<HTMLElement>(`.${className}`)!;

const setSnap = (isOn: boolean) =>
  document.documentElement.classList.toggle("landing-snap", isOn);

// The switch sentinels are the rails shifted up half a header, so a step flips
// mid-way between two rest positions, where the finger dot taps.
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
          const step = Number((entry.target as HTMLElement).dataset.stepSwitch);
          section.dataset.step = String(step);
          latestOnStep.current(step);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    section
      .querySelectorAll("[data-step-switch]")
      .forEach((sentinel) => observer.observe(sentinel));
    return () => observer.disconnect();
  }, [sectionRef, isStaticLayout, latestOnStep]);
};

const ENTER_ANIMATIONS_SETTLE_MS = 900;
// the app's panels slide in after every state change (tailwind-animate)
const SLIDE_SELECTOR = '[class*="slide-in-from"]';

// The dot's path is a CSS scroll-driven animation; its tap targets are measured
// live, taps 2 and 3 in the hidden mirror panels so the visible store is never
// touched. A missing target hides the dot rather than send it to 0,0.
export const useFingerDot = (
  sectionRef: RefObject<HTMLElement | null>,
  locate: ((tap: number, frame: HTMLElement) => Element | null) | undefined,
) => {
  const isEnabled = useIsFingerDotEnabled();
  const latestLocate = useLatest(locate);

  useEffect(() => {
    if (!isEnabled) return;
    const section = sectionRef.current!;
    const stage = findPart(section, styles.stage!);
    const frame = findPart(section, styles.frame!);
    const dotParts = [
      ...section.querySelectorAll<HTMLElement>(
        `.${styles.fingerDot}, .${styles.fingerDotCore}, .${styles.fingerDotRing}`,
      ),
    ];
    let isCancelled = false;
    let placed = "";
    let pendingFrame = 0;

    const placeDot = () => {
      const locateTap = latestLocate.current;
      if (!locateTap) return;
      const stageBox = stage.getBoundingClientRect();
      // off-tray points sit on the field beside the tray, covering nothing
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
        const targetBox = locateTap(tap, frame)?.getBoundingClientRect();
        if (!targetBox || !targetBox.width) {
          delete section.dataset.hasFingerDot;
          placed = "";
          return;
        }
        // a quarter in from the right edge: on the target, clear of its label
        taps.push([
          targetBox.left + targetBox.width * 0.75,
          targetBox.top + targetBox.height / 2,
        ]);
      }
      // The second tapped button leaves with its panel, so the start steps off
      // the tray rather than onto another button.
      const start: [number, number] =
        field.bottom - tray.bottom >= 24
          ? [tray.left + tray.width / 2, (tray.bottom + field.bottom) / 2]
          : beside(taps[0]!);
      const toPixels = (value: number) => `${Math.round(value * 10) / 10}px`;
      const points = [start, ...taps].map(([x, y]) => [
        toPixels(x - stageBox.left),
        toPixels(y - stageBox.top),
      ]);
      const signature = points.join();
      if (signature === placed && "hasFingerDot" in section.dataset) return;
      placed = signature;
      points.forEach(([x, y], i) => {
        const name = i === 0 ? "start" : `tap-${i}`;
        stage.style.setProperty(`--finger-dot-${name}-x`, x!);
        stage.style.setProperty(`--finger-dot-${name}-y`, y!);
      });
      section.dataset.hasFingerDot = "";
      // a running scroll-driven animation keeps the var() values it started
      // with: restart it so the new targets reach the compositor
      for (const part of dotParts) {
        part.style.animationName = "none";
        void part.offsetWidth;
        part.style.animationName = "";
      }
    };
    const schedulePlace = () => {
      if (pendingFrame) return;
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = 0;
        placeDot();
      });
    };
    void (async () => {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const finite = frame
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        );
      await Promise.race([
        Promise.all(
          finite.map((animation) => animation.finished.catch(() => {})),
        ),
        new Promise((resolve) =>
          setTimeout(resolve, ENTER_ANIMATIONS_SETTLE_MS),
        ),
      ]);
      if (!isCancelled) placeDot();
    })();

    const observer = new ResizeObserver(schedulePlace);
    observer.observe(stage);
    observer.observe(frame);
    const handleAnimationEnd = (event: AnimationEvent) => {
      if ((event.target as Element).matches(SLIDE_SELECTOR)) schedulePlace();
    };
    frame.addEventListener("animationend", handleAnimationEnd);

    return () => {
      isCancelled = true;
      delete section.dataset.hasFingerDot;
      cancelAnimationFrame(pendingFrame);
      observer.disconnect();
      frame.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [sectionRef, isEnabled, latestLocate]);
};

const WHEEL_THRESHOLD = 30;
const GESTURE_GAP_MS = 150;
const SCROLL_TIMEOUT_MS = 1000;
// Chromium and Safari send ±100-120 per mouse notch
const NOTCH_OPENING_DELTA = 50;
const NOTCH_REPEAT_DELTA = 80;
const NOTCH_REPEAT_GAP_MS = 250;
const NAVIGATION_KEYS = ["PageDown", "PageUp", "End", "Home", " ", "Tab"];

// A mouse notch arrives in line/page units (Firefox) or as one large vertical
// delta; a trackpad opens with small deltas, often with deltaX.
const isWheelNotch = (event: WheelEvent) =>
  event.deltaMode !== 0 ||
  (event.deltaX === 0 && Math.abs(event.deltaY) >= NOTCH_OPENING_DELTA);

// Snap is on <html> only while the section is pinned, so leaving past the
// first or last step is never pulled back. Keyboard scrolls compute their
// destination up front, so snap is dropped for those keys.
export const useWheelStep = (sectionRef: RefObject<HTMLElement | null>) => {
  const isStaticLayout = useIsStaticLayout();
  const isReducedMotion = useReducedMotion();
  const isOnScreen = useInView(sectionRef);

  useEffect(() => {
    if (isStaticLayout) return;
    const section = sectionRef.current!;
    const headerOffset = parseFloat(
      getComputedStyle(findPart(section, styles.stage!)).top,
    );
    const syncSnap = () => {
      const sectionBox = section.getBoundingClientRect();
      setSnap(
        sectionBox.top <= headerOffset + 1 &&
          sectionBox.bottom >= window.innerHeight - 1,
      );
    };
    syncSnap();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!NAVIGATION_KEYS.includes(event.key)) return;
      const step = Number(section.dataset.step);
      const isDown = !(
        event.key === "PageUp" ||
        event.key === "Home" ||
        event.shiftKey
      );
      // inside the steps, PageDown / PageUp still land on a step position
      const isLeaving =
        event.key === "End" ||
        event.key === "Home" ||
        event.key === "Tab" ||
        (isDown ? step >= STEP_COUNT - 1 : step <= 0) ||
        section.getBoundingClientRect().top > headerOffset + 1;
      if (isLeaving) setSnap(false);
    };
    window.addEventListener("scroll", syncSnap, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", syncSnap);
      window.removeEventListener("keydown", handleKeyDown);
      setSnap(false);
    };
  }, [sectionRef, isStaticLayout]);

  useEffect(() => {
    if (isStaticLayout || !isOnScreen) return;
    const section = sectionRef.current!;
    const stage = findPart(section, styles.stage!);
    let mode: "step" | "scrub" | null = null;
    let accumulated = 0;
    let isLocked = false;
    let isBusy = false;
    let lastFire = 0;
    let measured: { track: number; base: number } | null = null;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let busyTimer: ReturnType<typeof setTimeout> | undefined;
    const finishScroll = () => {
      isBusy = false;
      clearTimeout(busyTimer);
    };
    const measure = () => ({
      track: stage.offsetHeight,
      // step i rests with the section top tucked under the header
      base:
        section.getBoundingClientRect().top +
        window.scrollY -
        parseFloat(getComputedStyle(stage).top),
    });

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      clearTimeout(gapTimer);
      gapTimer = setTimeout(() => {
        mode = null;
        isLocked = false;
        accumulated = 0;
        measured = null;
      }, GESTURE_GAP_MS);
      mode ??= isWheelNotch(event) ? "step" : "scrub";
      if (mode === "scrub") return;

      const { track, base } = (measured ??= measure());
      const direction = event.deltaY > 0 ? 1 : -1;
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
      event.preventDefault();
      // a trackpad's inertial tail is many small deltas; a mouse notch is one
      // big delta, so a settled big notch may start the next step without a pause
      const isNewNotch =
        !isBusy &&
        Math.abs(event.deltaY) >= NOTCH_REPEAT_DELTA &&
        event.timeStamp - lastFire > NOTCH_REPEAT_GAP_MS;
      if ((isLocked && !isNewNotch) || isBusy) return;
      accumulated += event.deltaY;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;
      isLocked = true;
      isBusy = true;
      lastFire = event.timeStamp;
      accumulated = 0;
      window.scrollTo({
        top: base + next * track,
        behavior: isReducedMotion ? "auto" : "smooth",
      });
      busyTimer = setTimeout(finishScroll, SCROLL_TIMEOUT_MS);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scrollend", finishScroll);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scrollend", finishScroll);
      clearTimeout(gapTimer);
      clearTimeout(busyTimer);
    };
  }, [sectionRef, isStaticLayout, isOnScreen, isReducedMotion]);
};

// half the step chip's 6rem height: the 3rem its dashed extension sits at in
// steps.module.css
const STEP_CHIP_CENTER_PX = 48;
// below lg the captions sit above the field, so the line takes the court's own place on it
const FIELD_ATTACK_LINE_RATIO = 0.3;

export const useAttackLine = (sectionRef: RefObject<HTMLElement | null>) => {
  const isWide = useMediaQuery("(min-width: 64rem)");

  useEffect(() => {
    const section = sectionRef.current!;
    const field = findPart(section, styles.field!);
    const captions = findPart(section, styles.captions!);
    const placeLine = () => {
      const fieldBox = field.getBoundingClientRect();
      const lineY = isWide
        ? captions.getBoundingClientRect().top -
          fieldBox.top +
          STEP_CHIP_CENTER_PX
        : fieldBox.height * FIELD_ATTACK_LINE_RATIO;
      field.style.setProperty("--walkthrough-attack-line-y", `${lineY}px`);
    };
    placeLine();
    const observer = new ResizeObserver(placeLine);
    observer.observe(field);
    observer.observe(captions);
    return () => observer.disconnect();
  }, [sectionRef, isWide]);
};
