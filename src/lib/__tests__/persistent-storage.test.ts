import { requestPersistentStorage } from "@/lib/persistent-storage";

const originalStorage = Object.getOwnPropertyDescriptor(navigator, "storage");

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(navigator, "storage", originalStorage);
  } else {
    delete (navigator as { storage?: unknown }).storage;
  }
});

describe("requestPersistentStorage", () => {
  it("calls navigator.storage.persist() exactly once when available", async () => {
    const persist = jest.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persist },
    });

    await requestPersistentStorage();

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("resolves when the browser declines the request", async () => {
    const persist = jest.fn().mockResolvedValue(false);
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persist },
    });

    await expect(requestPersistentStorage()).resolves.toBeUndefined();
  });

  it("swallows a rejected persist() call", async () => {
    const persist = jest.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persist },
    });

    await expect(requestPersistentStorage()).resolves.toBeUndefined();
  });

  it("does not throw when navigator.storage is absent", async () => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: undefined,
    });

    await expect(requestPersistentStorage()).resolves.toBeUndefined();
  });

  it("does not throw when navigator.storage.persist is absent", async () => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {},
    });

    await expect(requestPersistentStorage()).resolves.toBeUndefined();
  });
});
