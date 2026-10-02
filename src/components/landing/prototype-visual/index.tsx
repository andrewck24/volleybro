// PROTOTYPE: visual directions for the redesigned landing page, switchable via
// `/?variant=B1|B2|B3|B0&cta=1..5` and the floating bottom bar. Without the
// param `/` renders the current landing unchanged. B1–B3 are B-derived
// directions, B0 is round-1 B kept for reference (ignores `cta`). Throwaway —
// lives only on branch prototype/landing-visual-direction.
import "@/components/landing/prototype-visual/proto.css";
import { PrototypeSwitcher } from "@/components/landing/prototype-visual/prototype-switcher";
import { RallyProvider } from "@/components/landing/prototype-visual/rally";
import { CTA_OPTIONS } from "@/components/landing/prototype-visual/shared";
import { VariantB0 } from "@/components/landing/prototype-visual/variant-b0";
import { VariantB1 } from "@/components/landing/prototype-visual/variant-b1";
import { VariantB2 } from "@/components/landing/prototype-visual/variant-b2";
import { VariantB3 } from "@/components/landing/prototype-visual/variant-b3";

const VARIANTS = [
  { key: "B1", name: "記分板 · Scoreboard", Page: VariantB1 },
  { key: "B2", name: "發球線 · Serve Line", Page: VariantB2 },
  { key: "B3", name: "半場 · Split Court", Page: VariantB3 },
  { key: "B0", name: "賽點（第一輪 B）", Page: VariantB0 },
];

export const isLandingVariant = (v: unknown): v is string =>
  VARIANTS.some((x) => x.key === v);

export const LandingVariant = ({
  variant,
  cta: rawCta,
}: {
  variant: string;
  cta?: string;
}) => {
  const { Page } = VARIANTS.find((v) => v.key === variant)!;
  const cta = CTA_OPTIONS.some((c) => c.key === rawCta) ? rawCta! : "1";
  return (
    <>
      {/* one rally clock for the whole page; remount on switch */}
      <RallyProvider key={`${variant}-${cta}`}>
        <Page year={new Date().getFullYear()} cta={cta} />
      </RallyProvider>
      <PrototypeSwitcher
        variants={VARIANTS.map(({ key, name }) => ({ key, name }))}
        current={variant}
        ctas={CTA_OPTIONS}
        cta={cta}
      />
    </>
  );
};
