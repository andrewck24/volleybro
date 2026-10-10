"use client";

import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { RiCloseLine } from "react-icons/ri";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = ({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Viewport>) => (
  <ToastPrimitives.Viewport
    data-slot="ToastViewport"
    className={cn(
      "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-105",
      className,
    )}
    {...props}
  />
);

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md p-4 pr-6 shadow-lg ring-1 ring-foreground/10 transition-all data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:animate-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none sm:data-[state=open]:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        error:
          "error group bg-[color-mix(in_oklch,var(--error)_6%,var(--card))] text-error-text ring-error/30 dark:ring-error/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = ({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants>) => (
  <ToastPrimitives.Root
    data-slot="Toast"
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
);

const ToastAction = ({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Action>) => (
  <ToastPrimitives.Action
    data-slot="ToastAction"
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-transparent px-3 text-sm font-medium ring-1 ring-foreground/10 transition-colors hover:bg-secondary focus:ring-1 focus:ring-ring focus:outline-hidden disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

const ToastClose = ({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Close>) => (
  <ToastPrimitives.Close
    data-slot="ToastClose"
    className={cn(
      "absolute top-1 right-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-[.error]:text-error-text hover:text-foreground focus:opacity-100 focus:ring-1 focus:outline-hidden focus:group-[.error]:ring-error",
      className,
    )}
    toast-close=""
    {...props}
  >
    <RiCloseLine className="size-4" />
  </ToastPrimitives.Close>
);

const ToastTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Title>) => (
  <ToastPrimitives.Title
    data-slot="ToastTitle"
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
);

const ToastDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Description>) => (
  <ToastPrimitives.Description
    data-slot="ToastDescription"
    className={cn("text-sm opacity-90 group-[.error]:opacity-100", className)}
    {...props}
  />
);

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
  type ToastProps,
};
