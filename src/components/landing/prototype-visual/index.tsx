// PROTOTYPE: visual directions for the redesigned landing page, switchable via
// `/?variant=B1|B2|B3|B0` and the floating bottom bar. Without the param `/`
// renders the current landing unchanged. Round 2: B ("賽點") won round 1; B1–B3
// are B-derived directions, B0 is round-1 B kept for reference. Throwaway —
// lives only on branch prototype/landing-visual-direction.
import "@/components/landing/prototype-visual/proto.css";
import { PrototypeSwitcher } from "@/components/landing/prototype-visual/prototype-switcher";
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

export const LandingVariant = ({ variant }: { variant: string }) => {
  const { Page } = VARIANTS.find((v) => v.key === variant)!;
  return (
    <>
      <Page year={new Date().getFullYear()} />
      <PrototypeSwitcher
        variants={VARIANTS.map(({ key, name }) => ({ key, name }))}
        current={variant}
      />
    </>
  );
};
