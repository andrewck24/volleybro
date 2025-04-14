"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { RiCloseLine } from "react-icons/ri";

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
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
);

const dialogContentVariants = cva(
  "fixed left-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-2 bg-card p-6 shadow-lg duration-200 overflow-x-hidden overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom rounded-md sm:rounded-lg sm:max-w-lg",
  {
    variants: {
      size: {
        default: "top-[50%] max-w-[90vw]",
        lg: "w-full h-[calc(100%-var(--safe-area-inset-top)-3rem)] top-[calc(50%+(var(--safe-area-inset-top)+3rem)/2)] max-w-full p-4",
      },
    },
    defaultVariants: { size: "default" },
  }
);

export interface DialogContentProps
  extends VariantProps<typeof dialogContentVariants> {
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
}

const DialogContent = ({
  size,
  closeButton = true,
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
      {closeButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <RiCloseLine className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
);

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="DialogHeader"
    className={cn(
      "flex flex-col flex-none justify-start items-start gap-1",
      className
    )}
    {...props}
  />
);

const DialogTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    data-slot="DialogTitle"
    className={cn(
      "w-full flex flex-row justify-start items-center gap-1 text-xl font-medium leading-none tracking-tight",
      className
    )}
    {...props}
  />
);

const DialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    data-slot="DialogDescription"
    className={cn("text-sm text-muted-foreground", className)}
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
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
