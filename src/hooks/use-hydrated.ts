import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export const useHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
