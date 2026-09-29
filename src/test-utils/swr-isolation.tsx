import type { ReactNode } from "react";
import { SWRConfig } from "swr";

/** Gives a test its own SWR cache, so a response cached by one test never answers another. */
export function SwrIsolation({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}
