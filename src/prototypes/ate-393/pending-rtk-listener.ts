import { createAction, createListenerMiddleware } from "@reduxjs/toolkit";
import { createAsyncPendingCore, type PendingPorts } from "./pending-core";

export const flushScope = createAction<string>("ate393/pending/flushScope");
export function createRtkPendingCore<T>(ports: PendingPorts<T>) {
  const core = createAsyncPendingCore(ports);
  const listener = createListenerMiddleware();
  listener.startListening({
    actionCreator: flushScope,
    effect: async (action) => {
      await core.flush(action.payload);
    },
  });
  return { ...core, middleware: listener.middleware, listener };
}
export { createRtkPendingCore as createPendingCore };
