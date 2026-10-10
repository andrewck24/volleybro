import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
const alertVariants = cva(
  "relative flex w-full flex-col gap-2 rounded-md px-4 py-3 text-sm ring-1 ring-inset [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:size-4 [&>svg]:text-foreground [&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground ring-foreground/5",
        error:
          "bg-[color-mix(in_oklch,var(--error)_6%,var(--card))] text-error-text ring-error/30 dark:ring-error/50 [&>svg]:text-error-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = ({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>) => (
  <div
    role="alert"
    data-slot="Alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
);

const AlertTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5
    data-slot="AlertTitle"
    className={cn("mb-1 leading-none font-medium tracking-tight", className)}
    {...props}
  />
);

const AlertDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="AlertDescription"
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
);

export { Alert, AlertDescription, AlertTitle };
