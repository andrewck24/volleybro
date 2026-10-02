"use client";

// PROTOTYPE (throwaway). One shell, two drivers:
//  - scrub=false: IntersectionObserver -> `step`, CSS transition (fixed duration)
//  - scrub=true : useScroll -> `p` (0..3) -> useTransform straight to transform/opacity
// snap=true: document-level `scroll-snap-type: y mandatory` while mounted.
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

export const STEPS = [
  { t: "選球員", d: "點場上的球員，決定這一球是誰的。" },
  { t: "我方動作", d: "從動作面板挑一個：發球、攻擊、攔網……" },
  { t: "對方回應", d: "面板換成對方的結果，再點一次。" },
  { t: "預覽送出", d: "確認這一球的摘要，送出即記錄完成。" },
];
export const N = STEPS.length;
const AT = STEPS.map((_, i) => i);

// value of each layer at step 0..3. "y" kind: 1 = fully hidden below, 0 = shown.
export const S = {
  ring: [1, 1, 1, 0.4],
  own: [1, 0, 1, 1],
  opp: [1, 1, 0, 1],
  ownSel: [0, 1, 1, 1],
  oppSel: [0, 0, 1, 1],
  card: [0, 0, 0, 1],
};
export const one = (i: number) => AT.map((j) => (i === j ? 1 : 0));

export type LayerProps = {
  vals: number[];
  kind: "y" | "o";
  className?: string;
  children?: ReactNode;
};

const StepCtx = createContext(0);
const PCtx = createContext<MotionValue<number> | null>(null);

function LayerCss({ vals, kind, className = "", children }: LayerProps) {
  const v = vals[useContext(StepCtx)] ?? 0;
  return (
    <div
      className={`transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none ${className}`}
      style={
        kind === "y" ? { transform: `translateY(${v * 100}%)` } : { opacity: v }
      }
    >
      {children}
    </div>
  );
}

function LayerScrub({ vals, kind, className, children }: LayerProps) {
  const p = useContext(PCtx)!;
  const y = useTransform(
    p,
    AT,
    vals.map((v) => `${v * 100}%`),
  );
  const opacity = useTransform(p, AT, vals);
  return (
    <motion.div
      className={className}
      style={kind === "y" ? { y } : { opacity }}
    >
      {children}
    </motion.div>
  );
}

const PANELS = [
  {
    k: "own",
    sel: "ownSel",
    title: "我方動作",
    btn: ["發球", "接球", "舉球", "攻擊", "攔網"],
    pick: 3,
  },
  {
    k: "opp",
    sel: "oppSel",
    title: "對方回應",
    btn: ["得分", "被接起", "攔網", "出界"],
    pick: 1,
  },
] as const;

export function Screen({
  L,
  flat = false,
}: {
  L: (p: LayerProps) => ReactNode;
  flat?: boolean;
}) {
  const sh = flat ? "" : "shadow-md";
  return (
    <div className="relative aspect-[9/17] w-[min(46vw,260px)] overflow-hidden rounded-[2rem] bg-card shadow-lg">
      <div className="px-4 pt-8 text-center text-[10px] text-muted-foreground">
        對方
      </div>
      <div className="mx-4 mt-1 h-px bg-muted" />
      <div className="grid grid-cols-3 gap-3 p-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div
            key={n}
            className="relative flex aspect-square items-center justify-center rounded-full bg-muted text-xs"
          >
            {n === 5 && (
              <L
                vals={S.ring}
                kind="o"
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <span
              className={`relative ${n === 5 ? "text-primary-foreground" : ""}`}
            >
              {n}
            </span>
          </div>
        ))}
      </div>
      {PANELS.map((p) => (
        <L
          key={p.k}
          vals={S[p.k]}
          kind="y"
          className={`absolute inset-x-0 bottom-0 rounded-t-xl bg-popover p-3 ${sh}`}
        >
          <div className="mb-2 text-[10px] text-muted-foreground">
            {p.title}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {p.btn.map((b, i) => (
              <div
                key={b}
                className="relative flex h-9 items-center justify-center rounded-md bg-muted text-xs"
              >
                {i === p.pick && (
                  <L
                    vals={S[p.sel]}
                    kind="o"
                    className="absolute inset-0 rounded-md bg-primary"
                  />
                )}
                <span
                  className={`relative ${i === p.pick ? "text-primary-foreground" : ""}`}
                >
                  {b}
                </span>
              </div>
            ))}
          </div>
        </L>
      ))}
      <L
        vals={S.card}
        kind="o"
        className={`absolute inset-x-3 top-1/3 rounded-xl bg-popover p-4 ${sh}`}
      >
        <div className="text-xs text-muted-foreground">本球摘要</div>
        <div className="mt-1 text-sm font-medium">#5 攻擊 → 被接起</div>
        <div className="mt-3 rounded-md bg-success py-1.5 text-center text-xs text-white">
          已送出
        </div>
      </L>
    </div>
  );
}

export const Block = ({
  snap,
  children,
}: {
  snap: boolean;
  children: ReactNode;
}) => (
  <div
    className={`flex h-svh items-center justify-center bg-background text-muted-foreground ${snap ? "snap-start" : ""}`}
  >
    {children}
  </div>
);

export function Stage({
  L,
  snap,
  boxRef,
  flat,
  sectionClass = "",
}: {
  L: (p: LayerProps) => ReactNode;
  snap: boolean;
  boxRef: RefObject<HTMLElement | null>;
  flat?: boolean;
  sectionClass?: string;
}) {
  return (
    <>
      <Block snap={snap}>上方內容 1（hero 占位）</Block>
      <Block snap={snap}>上方內容 2</Block>
      <section ref={boxRef} className={`relative ${sectionClass}`}>
        <div className="sticky top-0 flex h-svh flex-col items-center justify-center gap-6 bg-background px-4 md:flex-row md:gap-16">
          <Screen L={L} flat={flat} />
          <div className="grid w-full max-w-xs">
            {STEPS.map((s, i) => (
              <L
                key={s.t}
                vals={one(i)}
                kind="o"
                className="col-start-1 row-start-1 text-center md:text-left"
              >
                <div className="text-xs text-muted-foreground">
                  步驟 {i + 1} / {N}
                </div>
                <h2 className="text-2xl font-semibold">{s.t}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </L>
            ))}
          </div>
        </div>
        <div className="-mt-[100svh]">
          {STEPS.map((s, i) => (
            <div
              key={s.t}
              data-i={i}
              className={`h-svh ${snap ? "snap-start" : ""}`}
            />
          ))}
        </div>
      </section>
      <Block snap={snap}>下方內容 1</Block>
      <Block snap={snap}>下方內容 2</Block>
    </>
  );
}

export function useDocSnap(snap: boolean) {
  useEffect(() => {
    if (!snap) return;
    // ponytail: document-level snap; spacer blocks are 100svh snap targets so mandatory can't trap content
    const el = document.documentElement;
    el.style.scrollSnapType = "y mandatory";
    return () => {
      el.style.scrollSnapType = "";
    };
  }, [snap]);
}

export const READOUT =
  "fixed top-3 left-3 z-50 rounded bg-foreground px-2 py-1 font-mono text-xs text-background";

export function PrototypeSteps({
  scrub,
  snap,
}: {
  scrub: boolean;
  snap: boolean;
}) {
  const box = useRef<HTMLElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: box,
    offset: ["start start", "end end"],
  });
  // reduced motion: scrub degrades to instant swaps at step boundaries
  const p = useTransform(scrollYProgress, (v) => {
    const x = v * (N - 1);
    return reduce ? Math.round(x) : x;
  });
  useMotionValueEvent(p, "change", (v) => {
    if (scrub && out.current) out.current.textContent = `p = ${v.toFixed(2)}`;
  });

  useDocSnap(snap);

  useEffect(() => {
    if (scrub || !box.current) return;
    // step flips when a track crosses the viewport midline
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
  }, [scrub]);

  useEffect(() => {
    if (!scrub && out.current)
      out.current.textContent = `step = ${step + 1}/${N}`;
  }, [scrub, step]);

  const L = scrub ? LayerScrub : LayerCss;
  const body = <Stage L={L} snap={snap} boxRef={box} />;

  return (
    <>
      <span ref={out} className={READOUT} />
      {scrub ? (
        <PCtx value={p}>{body}</PCtx>
      ) : (
        <StepCtx value={step}>{body}</StepCtx>
      )}
    </>
  );
}
