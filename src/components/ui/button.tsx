import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Link, { type LinkProps as NextLinkProps } from "next/link";
import * as React from "react";
import { RiLoader4Line } from "react-icons/ri";

import { cn } from "@/lib/utils";

const SECONDARY =
  "bg-secondary text-secondary-foreground shadow-sm ring-1 ring-transparent hover:bg-secondary/80";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background-color] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm ring-1 ring-transparent hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm ring-1 ring-transparent hover:bg-destructive/90",
        court:
          "bg-court text-court-foreground shadow-sm ring-1 ring-transparent hover:bg-court/90",
        outline:
          "bg-background text-foreground shadow-sm ring-1 ring-gray-950/10 hover:bg-muted/50 dark:ring-white/10",
        secondary: SECONDARY,
        ghost: "hover:bg-muted/50",
        segmented: `${SECONDARY} has-checked:bg-primary has-checked:text-primary-foreground has-checked:hover:bg-primary/90 aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90`,
        link: "text-primary-text underline-offset-4 hover:underline",
        glass:
          "rounded-full bg-white/60 text-foreground shadow-lg inset-ring inset-ring-black/5 backdrop-blur-md backdrop-saturate-150 hover:bg-white/75 dark:bg-white/10 dark:inset-ring-white/20 dark:hover:bg-white/20 opaque:bg-background opaque:inset-ring-foreground/40 opaque:backdrop-blur-none opaque:hover:bg-muted dark:opaque:bg-background dark:opaque:inset-ring-foreground/40 dark:opaque:hover:bg-muted",
      },
      size: {
        default: "h-(--control-size) px-3.5 py-2 [&>svg]:size-5",
        lg: "h-(--control-size-lg) px-8 py-2 text-lg [&>svg]:size-6",
        icon: "size-(--control-size) [&>svg]:size-7",
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
      {isLoading ? loadingContent(children, loadingText) : children}
    </Comp>
  );
};

const flatten = (nodes: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(nodes).flatMap((node) =>
    React.isValidElement<{ children?: React.ReactNode }>(node) &&
    node.type === React.Fragment
      ? flatten(node.props.children)
      : [node],
  );

// The spinner takes the icon's place, so the button keeps its width.
const loadingContent = (children: React.ReactNode, loadingText?: string) => {
  const spinner = <RiLoader4Line key="spinner" className="animate-spin" />;
  const parts = flatten(children);
  if (!parts.some((part) => React.isValidElement(part)))
    return [spinner, loadingText ?? children];

  let swapped = false;
  let texted = false;
  return parts.map((part) => {
    if (React.isValidElement(part)) {
      if (swapped) return null;
      swapped = true;
      return spinner;
    }
    if (loadingText === undefined) return part;
    if (texted) return null;
    texted = true;
    return loadingText;
  });
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
