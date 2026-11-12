import { cn } from "@/lib/utils";

export const V_ARM_LEFT = "M340 510L184 510L13 0L177 0L340 510Z";

export const V_ARM_RIGHT = "M537 0L372 488L298 258L377 0L537 0Z";

export const V_VIEWBOX = "-7 -27 564 564";

export const V_CORAL = "#FC7A56";
export const V_IVORY = "#F6F4F5";

export type LogoVariant = "adaptive" | "brand";

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
