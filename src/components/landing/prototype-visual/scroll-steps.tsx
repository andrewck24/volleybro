"use client";
import { COPY, STEPS } from "@/components/landing/prototype-visual/shared";
import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./scroll-steps.module.css";

// PROTOTYPE: 「每球三步」 as a CSS scroll-driven scrub (animation-timeline:
// view()) with section-scoped snap, ported from prototype/section3-scroll-steps
// variant B3. Zero JS per frame. Without animation-timeline support an
// IntersectionObserver picks the step and one CSS transition plays. The phone
// is a mock screen; real-component wiring is a later batch.

const N = STEPS.length;
const AT = STEPS.map((_, i) => i);
const one = (i: number) => AT.map((j) => (i === j ? 1 : 0));

// value of each layer at step 0..3. "y": 1 = hidden below, 0 = shown.
const S = {
  ring: [1, 1, 1, 0.4],
  own: [1, 0, 1, 1],
  opp: [1, 1, 0, 1],
  ownSel: [0, 1, 1, 1],
  oppSel: [0, 0, 1, 1],
  card: [0, 0, 0, 1],
};

const StepCtx = createContext(0);

const Layer = ({
  vals,
  kind,
  className,
  children,
}: {
  vals: number[];
  kind: "y" | "o";
  className?: string;
  children?: ReactNode;
}) => {
  const v = vals[useContext(StepCtx)] ?? 0;
  const style: Record<string, string | number> =
    kind === "y" ? { transform: `translateY(${v * 100}%)` } : { opacity: v };
  vals.forEach((x, i) => {
    style[`--v${i}`] = kind === "y" ? `${x * 100}%` : x;
  });
  return (
    <div
      className={cn(
        styles.layer,
        kind === "y" ? styles.y : styles.o,
        className,
      )}
      style={style as CSSProperties}
    >
      {children}
    </div>
  );
};

const PANELS = [
  {
    k: "own",
    sel: "ownSel",
    title: "我方動作",
    btn: ["發球", "攻擊", "攔網", "接發", "防守", "二傳"],
    pick: 1,
  },
  {
    k: "opp",
    sel: "oppSel",
    title: "對方回應",
    btn: ["攻擊", "攔網", "防守", "失誤"],
    pick: 2,
  },
] as const;

const Screen = () => (
  <div className="relative aspect-[9/17] w-[min(46vw,260px,24svh)] shrink-0 overflow-hidden rounded-[2rem] bg-card ring-4 ring-foreground lg:w-[min(260px,30svh)]">
    <div className="px-4 pt-6 text-center text-xs text-muted-foreground">
      場上
    </div>
    <div className="mx-4 mt-1 h-px bg-muted" />
    <div className="grid grid-cols-3 gap-2 p-3">
      {[7, 14, 3, 15, 4, 1].map((n) => (
        <div
          key={n}
          className="relative flex aspect-square items-center justify-center rounded-lg bg-muted text-sm font-bold"
        >
          {n === 14 && (
            <Layer
              vals={S.ring}
              kind="o"
              className="absolute inset-0 rounded-lg bg-primary"
            />
          )}
          <span
            className={cn("relative", n === 14 && "text-primary-foreground")}
          >
            {n}
          </span>
        </div>
      ))}
    </div>
    {PANELS.map((p) => (
      <Layer
        key={p.k}
        vals={S[p.k]}
        kind="y"
        className="absolute inset-x-0 bottom-0 rounded-t-xl bg-popover p-3"
      >
        <div className="mb-2 text-xs text-muted-foreground">{p.title}</div>
        <div className="grid grid-cols-2 gap-2">
          {p.btn.map((b, i) => (
            <div
              key={b}
              className="relative flex h-8 items-center justify-center rounded-md bg-muted text-xs"
            >
              {i === p.pick && (
                <Layer
                  vals={S[p.sel]}
                  kind="o"
                  className="absolute inset-0 rounded-md bg-primary"
                />
              )}
              <span
                className={cn(
                  "relative",
                  i === p.pick && "text-primary-foreground",
                )}
              >
                {b}
              </span>
            </div>
          ))}
        </div>
      </Layer>
    ))}
    <Layer
      vals={S.card}
      kind="o"
      className="absolute inset-x-3 top-1/3 rounded-xl bg-popover p-4"
    >
      <div className="text-xs text-muted-foreground">本球預覽</div>
      <div className="mt-1 text-sm font-bold">#14 攻擊 → 對方防守</div>
      <div className="mt-3 rounded-md bg-primary py-1.5 text-center text-xs font-bold text-primary-foreground">
        送出
      </div>
    </Layer>
  </div>
);

export type StepsTone = "b1" | "b2" | "b3";

const Numeral = ({ i, tone }: { i: number; tone: StepsTone }) => {
  const last = i === N - 1;
  if (tone === "b2")
    return (
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg text-2xl font-black",
          last
            ? "bg-[#FC7A56] text-neutral-950"
            : "bg-primary text-primary-foreground",
        )}
      >
        {last ? "✓" : i + 1}
      </span>
    );
  return (
    <span
      className={cn(
        "shrink-0 leading-none font-black tabular-nums",
        tone === "b1" ? "text-6xl" : "text-4xl",
        last ? "text-chart-2" : "text-chart-1",
      )}
    >
      {last ? "✓" : tone === "b1" ? `0${i + 1}` : i + 1}
    </span>
  );
};

const Texts = ({ tone }: { tone: StepsTone }) => (
  <div
    className={cn(
      styles.texts,
      "grid w-full max-w-md",
      tone === "b2" && "mx-auto",
    )}
  >
    {STEPS.map((s, i) => (
      <Layer
        key={s.title}
        vals={one(i)}
        kind="o"
        className={cn(
          "col-start-1 row-start-1 flex gap-5",
          tone === "b2" && "flex-col items-center text-center",
        )}
      >
        <Numeral i={i} tone={tone} />
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold tracking-widest text-muted-foreground">
            步驟 {i + 1} / {N}
          </p>
          <h3 className="text-2xl font-black">{s.title}</h3>
          <p className="text-muted-foreground">{s.body}</p>
        </div>
      </Layer>
    ))}
  </div>
);

const Heading = ({ center }: { center?: boolean }) => (
  <div className={cn("flex flex-col gap-4", center && "text-center")}>
    <h2 className="text-3xl leading-tight font-black md:text-5xl">
      {COPY.recordTitle}
    </h2>
    <p className="hidden text-lg text-muted-foreground md:block">
      {COPY.recordLead}
    </p>
  </div>
);

export const ScrollSteps = ({ tone }: { tone: StepsTone }) => {
  const box = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (CSS.supports("animation-timeline: view()")) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting)
            setStep(Number((e.target as HTMLElement).dataset.i));
        }),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    box.current!.querySelectorAll("[data-i]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <StepCtx value={step}>
      <section ref={box} className={cn(styles.section, "relative")}>
        <div className={styles.sticky}>
          {tone === "b1" && (
            <div className="mx-auto flex h-full max-w-7xl flex-col items-center justify-center gap-8 px-4 pt-14 md:px-8 lg:flex-row lg:justify-between lg:gap-24">
              <div className="flex w-full flex-col gap-8 lg:gap-14">
                <Heading />
                <Texts tone={tone} />
              </div>
              <Screen />
            </div>
          )}
          {tone === "b2" && (
            <div className="mx-auto flex h-full max-w-7xl flex-col items-center justify-center gap-8 px-4 pt-14 md:px-8">
              <Heading center />
              <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-20">
                <Screen />
                <Texts tone={tone} />
              </div>
            </div>
          )}
          {tone === "b3" && (
            <div className="grid h-full grid-cols-1 pt-14 lg:grid-cols-2">
              <div className="flex items-center justify-center bg-card px-4 py-6">
                <Screen />
              </div>
              <div className="flex flex-col justify-center gap-8 px-4 py-6 md:px-12 lg:px-16">
                <Heading />
                <Texts tone={tone} />
              </div>
            </div>
          )}
        </div>
        <div className={styles.tracks} aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s.title} data-i={i} className={styles.track} />
          ))}
        </div>
      </section>
    </StepCtx>
  );
};
