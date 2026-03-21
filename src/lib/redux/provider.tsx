"use client";
import { AppStore, makeStore } from "@/lib/redux/store";
import { type ReactNode } from "react";
import { Provider } from "react-redux";

let store: AppStore | undefined;
function getStore() {
  if (!store) store = makeStore();
  return store;
}

export const ReduxProvider = ({ children }: { children: ReactNode }) => {
  return <Provider store={getStore()}>{children}</Provider>;
};
