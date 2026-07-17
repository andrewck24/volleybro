import { cn } from "@/lib/utils";

/**
 * The single source of truth for the "V" mark geometry. Saira Stencil One "V"
 * glyph, split into two independent sub-paths so each arm can be coloured on its
 * own (no clipping tricks). Also consumed by `src/app/apple-splash/[size]/route.tsx`
 * — import these consts there rather than re-declaring the paths.
 */
export const V_ARM_LEFT =
  "M107.01 581.12L102.40 566.27Q95.74 545.79 90.62 526.34L90.62 526.34" +
  "L74.24 470.02Q66.05 442.37 61.44 428.54L61.44 428.54Q57.34 413.18 54.78 405.50" +
  "L54.78 405.50L2.56 228.86L107.01 228.86L202.75 581.12L107.01 581.12Z";

export const V_ARM_RIGHT =
  "M225.28 581.12L182.78 424.96L234.50 228.86L336.90 228.86L284.67 405.50" +
  "L265.73 470.02Q256.51 499.71 248.83 526.34L248.83 526.34Q243.71 545.79 237.06 566.27" +
  "L237.06 566.27L232.45 581.12L225.28 581.12Z";

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
    viewBox="-10 225 360 360"
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
