"use client";

import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

export default function GameLayout({ children }: { children: ReactNode }) {
  const { gameId } = useParams<{ gameId: string }>();
  const pendingWrites = usePendingWrites(gameId);

  return (
    <PendingWritesContext.Provider value={pendingWrites}>
      {children}
    </PendingWritesContext.Provider>
  );
}
