import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Link, { type LinkProps as NextLinkProps } from "next/link";
import { RiLoader4Line } from "react-icons/ri";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap gap-2 rounded-md font-medium transition-[color,box-shadow] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "bg-background border shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 rounded-md px-2 py-2 text-sm [&>svg]:size-5",
        xs: "h-6 rounded-md p-0 md:px-1 text-xs [&>svg]:size-4",
        sm: "h-8 rounded-md p-0 md:px-3 text-xs [&>svg]:size-4",
        lg: "h-10 rounded-md p-0 md:px-8 text-lg [&>svg]:size-6",
        wide: "w-full h-10 px-3 text-lg rounded-md justify-start [&>svg]:size-6",
        icon: "size-8 [&>svg]:size-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
  extends NextLinkProps,
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

export { Button, ButtonLink as Link, buttonVariants };
