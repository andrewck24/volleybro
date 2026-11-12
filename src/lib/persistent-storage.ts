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
