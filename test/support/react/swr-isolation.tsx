import type { ReactNode } from "react";
import { SWRConfig } from "swr";

/** Gives a test its own SWR cache, so a response cached by one test never answers another; a test may pass the cache to read it. */
export function SwrIsolation({
  children,
  cache = new Map(),
}: {
  children: ReactNode;
  cache?: Map<string, unknown>;
}) {
  return (
    <SWRConfig value={{ provider: () => cache as never, dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}
