import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import type { ReactNode } from "react";

export const PendingWritesOwner = ({ children }: { children: ReactNode }) => (
  <PendingWritesContext.Provider value={usePendingWrites("game-1")}>
    {children}
  </PendingWritesContext.Provider>
);
