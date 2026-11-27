"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { RiCloseLine } from "react-icons/ri";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    data-slot="DialogOverlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
);

const dialogContentVariants = cva(
  "fixed left-[50%] z-50 flex w-full translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-md bg-card shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom data-[state=open]:zoom-in-95 sm:max-w-lg sm:rounded-lg",
  {
    variants: {
      size: {
        default: "top-[50%] max-h-[85svh] max-w-[90vw]",
        lg: "top-[calc(50%+(var(--safe-area-inset-top)+var(--header-height))/2)] h-[calc(100%-var(--safe-area-inset-top)-var(--header-height))] w-full sm:max-w-page",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export interface DialogContentProps extends VariantProps<
  typeof dialogContentVariants
> {
  size?: "default" | "lg";
}

const DialogContent = ({
  size,
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  DialogContentProps) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      data-slot="DialogContent"
      className={cn(dialogContentVariants({ size, className }))}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
);

const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="DialogBody"
    className={cn(
      "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-(--page-gutter) pb-4 max-sm:[&>[data-slot=Court]]:-mx-(--page-gutter) max-sm:[&>[data-slot=Court]]:w-[calc(100%+2*var(--page-gutter))]",
      className,
    )}
    {...props}
  />
);

const DialogCloseButton = (props: Omit<ButtonProps, "children">) => (
  <DialogPrimitive.Close asChild>
    <Button type="button" variant="glass" size="icon" {...props}>
      <RiCloseLine />
      <span className="sr-only">關閉</span>
    </Button>
  </DialogPrimitive.Close>
);

const DialogHeaderSpacer = () => (
  <div aria-hidden className="size-(--control-size) shrink-0" />
);

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const DialogHeader = ({
  leading = <DialogCloseButton />,
  trailing = <DialogHeaderSpacer />,
  className,
  children,
  ...props
}: DialogHeaderProps) => (
  <div
    data-slot="DialogHeader"
    className={cn(
      "flex min-h-(--header-height) flex-none flex-row items-center gap-3 px-(--page-gutter) py-2",
      className,
    )}
    {...props}
  >
    <div className="flex shrink-0">{leading}</div>
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
      {children}
    </div>
    <div className="flex shrink-0">{trailing}</div>
  </div>
);

const DIALOG_TITLE_CLASS_NAME =
  "text-xl leading-tight font-medium tracking-tight text-balance";

const DialogTitle = ({
  srOnly = false,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title> & {
  srOnly?: boolean;
}) => (
  <DialogPrimitive.Title
    data-slot="DialogTitle"
    className={cn(
      DIALOG_TITLE_CLASS_NAME,
      "text-center",
      srOnly && "sr-only",
      className,
    )}
    {...props}
  />
);

const DialogDescription = ({
  srOnly = false,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description> & {
  srOnly?: boolean;
}) => (
  <DialogPrimitive.Description
    data-slot="DialogDescription"
    className={cn(
      "text-sm text-muted-foreground",
      srOnly && "sr-only",
      className,
    )}
    {...props}
  />
);

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="DialogFooter"
    className={cn(
      "flex flex-col-reverse px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DIALOG_TITLE_CLASS_NAME,
  dialogContentVariants,
};
