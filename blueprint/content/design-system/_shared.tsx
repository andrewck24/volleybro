"use client";

// Shared building blocks for the design-system reference pages.
//
// The blueprint consumes the same src/styles/tokens.css as the app, so every
// swatch renders straight from var(--token) — no hard-coded values. Each chip
// shows both themes at once by scoping its halves with the `.light` / `.dark`
// classes that tokens.css defines, and the displayed color strings are read
// from the computed style at runtime so they can never drift from the source.

import { useEffect, useRef, useState } from "react";

export type TokenInfo = {
  name: string; // CSS custom property, e.g. "--background"
  usage: string;
};

function useResolved(ref: React.RefObject<HTMLElement | null>) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (ref.current) {
      setValue(getComputedStyle(ref.current).backgroundColor);
    }
  }, [ref]);
  return value;
}

// A single token rendered as a split light/dark chip with resolved values.
export function Swatch({ token }: { token: TokenInfo }) {
  const lightRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const lightValue = useResolved(lightRef);
  const darkValue = useResolved(darkRef);
  const bg = `var(${token.name})`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex h-14 overflow-hidden rounded-lg border border-border">
        <div
          className="light flex-1"
          ref={lightRef}
          style={{ background: bg }}
        />
        <div className="dark flex-1" ref={darkRef} style={{ background: bg }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <code className="text-xs font-semibold">{token.name}</code>
        <span className="text-[0.7rem] text-muted-foreground tabular-nums">
          {lightValue}
        </span>
        <span className="text-[0.7rem] text-muted-foreground tabular-nums">
          {darkValue}
        </span>
        <span className="text-xs opacity-85">{token.usage}</span>
      </div>
    </div>
  );
}

// A responsive grid of swatches for one token group.
export function SwatchGrid({ tokens }: { tokens: TokenInfo[] }) {
  return (
    <div className="my-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      {tokens.map((t) => (
        <Swatch key={t.name} token={t} />
      ))}
    </div>
  );
}
