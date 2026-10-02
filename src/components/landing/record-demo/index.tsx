"use client";
// PROTOTYPE (throwaway): `/?variant=a|b` mounts sections 3-4 (a: real
// components on a demo store + SWR cache, b: presentational parts on props)
// and the Hero rally clock. Without the param the landing is unchanged.
//
// Sections 3-4 sit behind next/dynamic and only load once the placeholder is
// within one viewport of the screen, so `/` ships none of their code up front.
import { HeroClock } from "@/components/landing/record-demo/hero-clock";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const VariantA = dynamic(
  () =>
    import("@/components/landing/record-demo/variant-a").then(
      (m) => m.VariantA,
    ),
  { ssr: false },
);
const VariantB = dynamic(
  () =>
    import("@/components/landing/record-demo/variant-b").then(
      (m) => m.VariantB,
    ),
  { ssr: false },
);

const LazyWhenNear = ({ children }: { children: React.ReactNode }) => {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e!.isIntersecting) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(box.current!);
    return () => io.disconnect();
  }, []);

  // placeholder keeps the final height so loading never shifts the page
  return near ? (
    children
  ) : (
    <div ref={box} aria-hidden style={{ minHeight: "500svh" }} />
  );
};

export const RecordDemoGate = () => {
  const variant = useSearchParams().get("variant");
  if (variant !== "a" && variant !== "b") return null;
  return (
    <>
      <HeroClock variant={variant} />
      <LazyWhenNear>
        {variant === "a" ? <VariantA /> : <VariantB />}
      </LazyWhenNear>
    </>
  );
};
