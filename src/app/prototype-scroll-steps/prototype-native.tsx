"use client";

// PROTOTYPE (throwaway). B3: no JS per frame. Layers are CSS scroll-driven animations
// (animation-timeline) on transform/opacity only; mandatory document snap as in A1/B2.
// Without animation-timeline support: A1 fallback (IntersectionObserver -> inline style + transition).
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  N,
  READOUT,
  Stage,
  useDocSnap,
  type LayerProps,
} from "./prototype-steps";
import styles from "./prototype-native.module.css";

const StepCtx = createContext(0);

function LayerNative({ vals, kind, className = "", children }: LayerProps) {
  const v = vals[useContext(StepCtx)] ?? 0;
  const style: Record<string, string | number> = {
    ...(kind === "y"
      ? { transform: `translateY(${v * 100}%)` }
      : { opacity: v }),
  };
  vals.forEach((x, i) => {
    style[`--v${i}`] = kind === "y" ? `${x * 100}%` : x;
  });
  return (
    <div
      className={`${styles.layer} ${kind === "y" ? styles.y : styles.o} ${className}`}
      style={style as CSSProperties}
    >
      {children}
    </div>
  );
}

export function PrototypeNative() {
  const box = useRef<HTMLElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const [step, setStep] = useState(0);
  useDocSnap(true);
  const native =
    typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");

  useEffect(() => {
    if (native || !box.current) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting)
            setStep(Number((e.target as HTMLElement).dataset.i));
        }),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    box.current.querySelectorAll("[data-i]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [native]);

  useEffect(() => {
    if (out.current)
      out.current.textContent = native
        ? "CSS scroll-driven (no JS/frame)"
        : `fallback A1 step = ${step + 1}/${N}`;
  }, [native, step]);

  return (
    <>
      <span ref={out} className={READOUT} />
      <StepCtx value={step}>
        <Stage
          L={LayerNative}
          snap
          boxRef={box}
          flat
          sectionClass={styles.section}
        />
      </StepCtx>
    </>
  );
}
