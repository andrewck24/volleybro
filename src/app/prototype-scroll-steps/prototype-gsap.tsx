"use client";

// PROTOTYPE (throwaway). B4: one gsap.timeline (label per step) scrubbed by ScrollTrigger
// (scrub 0.5 smoothing + labelsDirectional snap). No document CSS snap. transform(yPercent)/opacity only.
import { useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { N, READOUT, Stage, type LayerProps } from "./prototype-steps";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// timeline position i = step i; layers are found by data attrs inside the scope
function LayerGsap({ vals, kind, className, children }: LayerProps) {
  return (
    <div
      className={className}
      data-g={kind}
      data-vals={vals.join(",")}
      style={{ willChange: "transform, opacity" } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function PrototypeGsap() {
  const box = useRef<HTMLElement>(null);
  const out = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          full: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const instant = !!ctx.conditions?.reduce;
          const tl = gsap.timeline({ defaults: { ease: "none" } });
          const prop = (kind: string, v: number) =>
            kind === "y" ? { yPercent: v * 100 } : { opacity: v };
          gsap.utils.toArray<HTMLElement>("[data-g]").forEach((el) => {
            const kind = el.dataset.g!;
            const vals = el.dataset.vals!.split(",").map(Number) as number[];
            const v = (i: number) => vals[i]!;
            tl.set(el, prop(kind, v(0)), 0);
            for (let i = 1; i < N; i++) {
              if (v(i) === v(i - 1)) continue;
              if (instant) tl.set(el, prop(kind, v(i)), i - 0.5);
              else tl.to(el, { ...prop(kind, v(i)), duration: 1 }, i - 1);
            }
          });
          tl.set({}, {}, N - 1); // pin total duration to N-1 even if the last tweens end earlier
          for (let i = 0; i < N; i++) tl.addLabel(`s${i}`, i);

          ScrollTrigger.create({
            trigger: box.current,
            start: "top top",
            end: "bottom bottom",
            animation: tl,
            scrub: instant ? true : 0.5,
            snap: instant
              ? undefined
              : {
                  snapTo: "labelsDirectional",
                  duration: { min: 0.2, max: 0.5 },
                  ease: "power1.inOut",
                },
            onUpdate: (self) => {
              if (out.current)
                out.current.textContent = `p = ${(self.progress * (N - 1)).toFixed(2)}`;
            },
          });
        },
      );
      return () => mm.revert();
    },
    { scope: box },
  );

  return (
    <>
      <span ref={out} className={READOUT}>
        p = 0.00
      </span>
      <Stage L={LayerGsap} snap={false} boxRef={box} flat={false} />
    </>
  );
}
