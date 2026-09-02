"use client";
import {
  probePendingWritesStorage,
  restorePendingWrites,
} from "@/lib/features/game/pending-writes-persistence";
import { localStoragePendingWrites } from "@/lib/features/game/pending-writes-storage";
import { requestPersistentStorage } from "@/lib/persistent-storage";
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
  // In an effect because this component renders on the server too, where there
  // is no storage to read. Running twice is harmless: `rehydrated` merges.
  useEffect(() => {
    void restorePendingWrites(store.dispatch, localStoragePendingWrites);
    void probePendingWritesStorage(store.dispatch, localStoragePendingWrites);
    // Covers what the probe cannot see: eviction under disk pressure and
    // iOS ITP's inactivity sweep throw nothing, so a store that passes the
    // probe can still lose the queue later. Best effort and unverifiable --
    // nothing here reads the outcome.
    void requestPersistentStorage();
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
};
