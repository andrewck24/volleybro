import React from "react";

interface TLDRProps {
  children: React.ReactNode;
}

export function TLDR({ children }: TLDRProps) {
  return (
    <div className="my-6 rounded-r-md border-l-4 border-primary bg-muted/40 py-3 pr-4 pl-4">
      <span className="font-mono text-xs font-semibold tracking-wide text-primary uppercase">
        TL;DR
      </span>
      <div className="text-base leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  );
}
