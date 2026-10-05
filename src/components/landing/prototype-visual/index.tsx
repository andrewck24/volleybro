// PROTOTYPE: redesigned landing, direction B1 「記分板」 (picked in round 3).
// `/?variant=B1&header=1..3&ctaLayout=1..3&curve=sharp|round`, switchable from
// the floating bottom bar. Without `variant` `/` renders the current landing
// unchanged. Throwaway — lives only on branch prototype/landing-visual-direction.
import "@/components/landing/prototype-visual/proto.css";
import { PrototypeSwitcher } from "@/components/landing/prototype-visual/prototype-switcher";
import { RallyProvider } from "@/components/landing/prototype-visual/rally";
import {
  CTA_LAYOUTS,
  CURVES,
  HEADER_OPTIONS,
} from "@/components/landing/prototype-visual/shared";
import { VariantB1 } from "@/components/landing/prototype-visual/variant-b1";

export type LandingParams = {
  variant?: string;
  header?: string;
  ctaLayout?: string;
  curve?: string;
};

export const isLandingVariant = (v: unknown): v is string => v === "B1";

const pick = (opts: { key: string }[], v?: string) =>
  opts.some((o) => o.key === v) ? v! : opts[0]!.key;

export const LandingVariant = (p: LandingParams) => {
  const header = pick(HEADER_OPTIONS, p.header);
  const ctaLayout = pick(CTA_LAYOUTS, p.ctaLayout);
  const curve = pick(CURVES, p.curve);
  const strip = (o: { key: string; name: string }[]) =>
    o.map(({ key, name }) => ({ key, name }));
  return (
    <>
      {/* one rally clock for the whole page; remount on switch */}
      <RallyProvider key={`${header}-${ctaLayout}-${curve}`}>
        <VariantB1
          year={new Date().getFullYear()}
          header={header}
          ctaLayout={ctaLayout}
          curve={curve}
        />
      </RallyProvider>
      <PrototypeSwitcher
        rows={[
          {
            param: "header",
            label: "Header",
            opts: strip(HEADER_OPTIONS),
            cur: header,
          },
          {
            param: "ctaLayout",
            label: "CTA <lg",
            opts: strip(CTA_LAYOUTS),
            cur: ctaLayout,
          },
          { param: "curve", label: "曲線", opts: strip(CURVES), cur: curve },
        ]}
      />
    </>
  );
};
