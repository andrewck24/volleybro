import type { ReactNode } from "react";
import { SWRConfig, type Cache } from "swr";

export function SwrIsolation({
  children,
  cache = new Map(),
}: {
  children: ReactNode;
  cache?: Cache;
}) {
  return (
    <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}
