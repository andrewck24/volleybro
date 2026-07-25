// Preloaded via NODE_OPTIONS=--import before any module in every forked Jest
// worker. Next captures globalThis.AsyncLocalStorage at import time and falls
// back to a stub that throws on use when it is absent; expose it up front.
import { AsyncLocalStorage } from "node:async_hooks";

globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
