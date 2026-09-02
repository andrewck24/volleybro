/**
 * Asks the browser to mark this origin's storage as persistent, once, at app
 * start. This is a request, not a result: a resolved `true` means only that
 * the browser accepted it, not that data will survive disk-pressure eviction
 * or iOS ITP's inactivity sweep -- both of which throw nothing, so nothing
 * short of this call can even try to prevent them (see D3 of
 * honest-sync-status). No caller may treat the outcome as a durability
 * guarantee; nothing is returned to make that mistake with.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    // Only a refusal is logged. A granted request is the ordinary case and
    // would print on every start, and the log would be the only thing here
    // that looked like a guarantee.
    const granted = await navigator.storage?.persist?.();
    if (granted === false) {
      console.warn("[persistentStorage] request declined by the browser");
    }
  } catch (error) {
    console.warn("[persistentStorage] request failed:", error);
  }
}
