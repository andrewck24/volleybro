"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { RiCloseLine, RiExpandDiagonalLine } from "react-icons/ri";

import { Button } from "@/components/ui/button";
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
        lg: "top-[calc(50%+(var(--safe-area-inset-top)+3rem)/2)] h-[calc(100%-var(--safe-area-inset-top)-3rem)] w-full sm:max-w-196",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export interface DialogContentProps extends VariantProps<
  typeof dialogContentVariants
> {
  /**
   * Size of the dialog content.
   * When `lg`, the dialog will be full width and height.
   * @type "default" | "lg"
   * @defaultValue "default"
   */
  size?: "default" | "lg";
  /**
   * When `true`, a close button will be rendered in the top-right corner.
   * @type boolean
   * @defaultValue true
   */
  closeButton?: boolean;
  /**
   * When provided, an expand button is rendered in the control group and
   * this handler is called on click.
   */
  onExpand?: () => void;
  /**
   * Accessible label for the expand button.
   */
  expandLabel?: string;
}

const DialogContent = ({
  size,
  closeButton = true,
  onExpand,
  expandLabel,
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
      {(onExpand || closeButton) && (
        <div className="absolute top-3 right-3 flex flex-row items-center gap-1">
          {onExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onExpand}
              aria-label={expandLabel}
            >
              <RiExpandDiagonalLine className="size-4" />
            </Button>
          )}
          {closeButton && (
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <RiCloseLine className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          )}
        </div>
      )}
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
      "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4",
      className,
    )}
    {...props}
  />
);

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="DialogHeader"
    className={cn(
      "flex flex-none flex-col items-start justify-start gap-1 px-4 pt-4 pr-20 pb-2",
      className,
    )}
    {...props}
  />
);

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
      "flex w-full flex-row items-center justify-start gap-1 text-xl leading-none font-medium tracking-tight",
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
