import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import type { ReactNode } from "react";

/** Mounts the one pending-writes owner a game has, for components that read its context. */
export const PendingWritesOwner = ({ children }: { children: ReactNode }) => (
  <PendingWritesContext.Provider value={usePendingWrites("game-1", 0)}>
    {children}
  </PendingWritesContext.Provider>
);
