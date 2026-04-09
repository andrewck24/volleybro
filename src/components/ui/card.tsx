import * as React from "react";

import { cn } from "@/lib/utils";

const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="Card"
    className={cn(
      "flex flex-col gap-2 rounded-lg bg-card px-4 py-2 text-card-foreground shadow-sm ring-1 ring-foreground/10",
      className,
    )}
    {...props}
  />
);

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="CardHeader"
    className={cn(
      "flex flex-col items-start justify-center gap-2 py-2",
      className,
    )}
    {...props}
  />
);

const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    data-slot="CardTitle"
    className={cn(
      "flex w-full flex-row items-center justify-start gap-1 text-xl leading-none font-medium tracking-tight",
      className,
    )}
    {...props}
  />
);

const CardBtnGroup = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="CardBtnGroup"
    className={cn(
      "flex flex-1 flex-row items-center justify-end gap-2",
      className,
    )}
    {...props}
  />
);

const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    data-slot="CardDescription"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="CardContent"
    className={cn("flex flex-col items-center justify-start gap-2", className)}
    {...props}
  />
);

const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="CardFooter"
    className={cn("flex flex-col pb-2", className)}
    {...props}
  />
);

export {
  Card,
  CardBtnGroup,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
