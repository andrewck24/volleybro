import * as React from "react";
import { cn } from "@/lib/utils";

interface DescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Description = ({
  startIcon,
  endIcon,
  children,
  className,
  ...props
}: DescriptionProps) => {
  return (
    <div
      data-slot="Description"
      className={cn(
        "flex flex-1 flex-row items-center gap-2 [&>svg]:size-6",
        className,
      )}
      {...props}
    >
      {startIcon}
      <div className="flex h-fit min-h-10 flex-1 flex-col">{children}</div>
      {endIcon}
    </div>
  );
};

interface DescriptionTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const DescriptionTitle = ({ children, className }: DescriptionTitleProps) => {
  return (
    <p data-slot="DescriptionTitle" className={cn("font-semibold", className)}>
      {children}
    </p>
  );
};

interface DescriptionContentProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const DescriptionContent = ({
  children,
  className,
}: DescriptionContentProps) => {
  return (
    <p
      data-slot="DescriptionContent"
      className={cn("text-muted-foreground", className)}
    >
      {children}
    </p>
  );
};

export { Description, DescriptionTitle, DescriptionContent };
