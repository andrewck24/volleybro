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
  useEffect(() => {
    void restorePendingWrites(store.dispatch, localStoragePendingWrites);
    void probePendingWritesStorage(store.dispatch, localStoragePendingWrites);
    void requestPersistentStorage();
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
};
