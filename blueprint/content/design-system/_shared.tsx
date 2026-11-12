"use client";

import { useEffect, useRef, useState } from "react";

export type TokenInfo = {
  name: `--${string}`;
  usage?: string;
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
        {token.usage && (
          <span className="text-xs opacity-85">{token.usage}</span>
        )}
      </div>
    </div>
  );
}

export function SwatchGrid({ tokens }: { tokens: TokenInfo[] }) {
  return (
    <div className="my-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      {tokens.map((t) => (
        <Swatch key={t.name} token={t} />
      ))}
    </div>
  );
}
