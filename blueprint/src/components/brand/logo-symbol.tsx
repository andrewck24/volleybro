// Copied from src/components/brand/logo-symbol.tsx — the mark geometry is frozen
// (Saira glyph paths); re-copy only if the brand mark itself changes.
import { cn } from "@/lib/utils";

/**
 * The single source of truth for the "V" mark geometry. Saira Stencil (variable,
 * wdth 100, wght 700) lowercase `v` glyph, split into two independent sub-paths
 * so each arm can be coloured on its own (no clipping tricks). Also consumed by
 * `src/app/apple-splash/[size]/route.tsx` — import these consts there rather
 * than re-declaring the paths.
 */
export const V_ARM_LEFT = "M340 510L184 510L13 0L177 0L340 510Z";

export const V_ARM_RIGHT = "M537 0L372 488L298 258L377 0L537 0Z";

/** The symbol's own viewBox — the glyph's square canvas at wght 700. */
export const V_VIEWBOX = "-7 -27 564 564";

/** Fixed brand accent — the right arm is always coral, in every theme and ground. */
export const V_CORAL = "#FC7A56";
/** The ivory used for the neutral arm on the teal brand ground (icons, splash). */
export const V_IVORY = "#F6F4F5";

export type LogoVariant = "adaptive" | "brand";

/**
 * `adaptive` (default): the neutral left arm is `currentColor`, so it takes the
 * theme foreground — dark on light surfaces, light on dark. Use inside app UI.
 * `brand`: the left arm is fixed ivory, for the teal brand ground (app icon,
 * splash) where the mark must not follow the surrounding text colour.
 */
export const LogoSymbol = ({
  variant = "adaptive",
  className,
}: {
  variant?: LogoVariant;
  className?: string;
}) => (
  <svg
    viewBox={V_VIEWBOX}
    className={cn("h-full w-auto", className)}
    role="img"
    aria-label="VolleyBro"
  >
    <path
      d={V_ARM_LEFT}
      fill={variant === "brand" ? V_IVORY : "currentColor"}
    />
    <path d={V_ARM_RIGHT} fill={V_CORAL} />
  </svg>
);
