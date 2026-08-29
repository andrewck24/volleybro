"use client";
import { restorePendingWrites } from "@/lib/features/game/pending-writes-persistence";
import { localStoragePendingWrites } from "@/lib/features/game/pending-writes-storage";
import { AppStore, makeStore } from "@/lib/redux/store";
import { useEffect, type ReactNode } from "react";
import { Provider } from "react-redux";

let store: AppStore | undefined;
function getStore() {
  if (!store) store = makeStore();
  return store;
}

export const ReduxProvider = ({ children }: { children: ReactNode }) => {
  const store = getStore();
  // In an effect rather than beside makeStore: this component renders on the
  // server too, where there is no storage to read. Restoring is idempotent --
  // it merges by entry id and the in-memory copy wins -- so a second run
  // (StrictMode, a remount) puts nothing back twice.
  useEffect(() => {
    void restorePendingWrites(store.dispatch, localStoragePendingWrites);
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
};
