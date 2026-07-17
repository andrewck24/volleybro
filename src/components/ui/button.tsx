import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Link, { type LinkProps as NextLinkProps } from "next/link";
import * as React from "react";
import { RiLoader4Line } from "react-icons/ri";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background-color] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm ring-1 ring-transparent hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm ring-1 ring-transparent hover:bg-destructive/90",
        outline:
          "bg-background text-foreground shadow-sm ring-1 ring-gray-950/10 hover:bg-muted/50 dark:ring-white/10",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm ring-1 ring-transparent hover:bg-secondary/80",
        ghost: "hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 py-2 [&>svg]:size-5",
        xs: "h-6 px-2 py-1 text-xs [&>svg]:size-4",
        sm: "h-8 px-3 py-1.5 text-xs [&>svg]:size-4",
        lg: "h-10 px-8 py-2 text-lg [&>svg]:size-6",
        wide: "h-10 w-full justify-start px-3 py-2 text-lg [&>svg]:size-6",
        icon: "size-8 [&>svg]:size-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  const isLoading = !asChild && loading;
  return (
    <Comp
      data-slot="Button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      aria-busy={isLoading ? true : undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <RiLoader4Line className="animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
};

export interface LinkProps
  extends
    NextLinkProps,
    React.HTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {}

const ButtonLink = ({ className, variant, size, ...props }: LinkProps) => {
  return (
    <Link
      data-slot="ButtonLink"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};

export { Button, buttonVariants, ButtonLink as Link };
