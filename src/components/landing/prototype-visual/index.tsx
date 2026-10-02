// PROTOTYPE: three visual directions for the redesigned landing page,
// switchable via `/?variant=A|B|C` and the floating bottom bar. Without the
// param `/` renders the current landing unchanged. Throwaway — lives only on
// branch prototype/landing-visual-direction.
import "@/components/landing/prototype-visual/proto.css";
import { PrototypeSwitcher } from "@/components/landing/prototype-visual/prototype-switcher";
import { VariantA } from "@/components/landing/prototype-visual/variant-a";
import { VariantB } from "@/components/landing/prototype-visual/variant-b";
import { VariantC } from "@/components/landing/prototype-visual/variant-c";

const VARIANTS = [
  { key: "A", name: "場邊筆記 · Editorial", Page: VariantA },
  { key: "B", name: "賽點 · Bold Block", Page: VariantB },
  { key: "C", name: "戰情板 · Product Bento", Page: VariantC },
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
