// Compatibility layer for old-format Change pages; delete once all 22 are converted to the two-gate format.

"use client";

import { createContext, useContext, type ReactNode } from "react";

// Set by the legacy page shell around the whole rendered page (MDX and
// design.tsx alike), so DecisionTimeline strips a legacy `status` field only
// for pages it wraps; Feature and two-gate Change pages stay strict.
const LegacyDecisionsContext = createContext(false);

export function LegacyDecisionsProvider({ children }: { children: ReactNode }) {
  return (
    <LegacyDecisionsContext.Provider value={true}>
      {children}
    </LegacyDecisionsContext.Provider>
  );
}

export function useIsLegacyDecisions() {
  return useContext(LegacyDecisionsContext);
}
