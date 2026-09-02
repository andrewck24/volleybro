/**
 * Storage an origin has not been granted persistence for is evictable: the
 * system reclaims it under disk pressure, and iOS clears it after a stretch of
 * inactivity. Neither throws, so asking is the only defence there is.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    const granted = await navigator.storage?.persist?.();
    if (granted === false) {
      console.warn("[persistentStorage] request declined by the browser");
    }
  } catch (error) {
    console.warn("[persistentStorage] request failed:", error);
  }
}
