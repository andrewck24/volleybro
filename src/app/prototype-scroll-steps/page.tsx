// PROTOTYPE (throwaway): compare scroll mechanics for the landing "記錄怎麼做" section.
// /prototype-scroll-steps?variant=A1|A2|B1|B2|B3|B4
import { PrototypeSwitcher } from "./prototype-switcher";
import { PrototypeSteps } from "./prototype-steps";
import { PrototypeNative } from "./prototype-native";
import { PrototypeGsap } from "./prototype-gsap";

const VARIANTS = {
  A1: "離散 + mandatory snap",
  A2: "離散、無 snap",
  B1: "連續 scrub",
  B2: "scrub + snap",
  B3: "CSS scroll-driven＋snap",
  B4: "GSAP timeline＋scrub 平滑＋label snap",
} as const;
type Key = keyof typeof VARIANTS;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  const current: Key = variant && variant in VARIANTS ? (variant as Key) : "A1";
  return (
    <>
      {/* key remounts the section so observers / snap styles reset per variant */}
      {current === "B3" ? (
        <PrototypeNative key={current} />
      ) : current === "B4" ? (
        <PrototypeGsap key={current} />
      ) : (
        <PrototypeSteps
          key={current}
          scrub={current.startsWith("B")}
          snap={current === "A1" || current === "B2"}
        />
      )}
      <PrototypeSwitcher variants={VARIANTS} current={current} />
    </>
  );
}
