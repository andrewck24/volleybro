// PROTOTYPE (throwaway): compare scroll mechanics for the landing "記錄怎麼做" section.
// /prototype-scroll-steps?variant=A1|A2|B1|B2
import { PrototypeSwitcher } from "./prototype-switcher";
import { PrototypeSteps } from "./prototype-steps";

const VARIANTS = {
  A1: "離散 + mandatory snap",
  A2: "離散、無 snap",
  B1: "連續 scrub",
  B2: "scrub + snap",
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
      <PrototypeSteps
        key={current}
        scrub={current.startsWith("B")}
        snap={current === "A1" || current === "B2"}
      />
      <PrototypeSwitcher variants={VARIANTS} current={current} />
    </>
  );
}
