import * as React from "react";

import { cn } from "@/lib/utils";

const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      data-slot="Input"
      className={cn(
        /* experimental: ring technique - inset ring replaces border */
        "flex h-9 w-full rounded-md bg-transparent px-3 py-1 text-lg shadow-xs ring-1 ring-foreground/10 transition-colors ring-inset file:border-0 file:bg-transparent file:text-lg file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
};

export { Input };
