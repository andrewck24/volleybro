import { createActiveTeamPreferenceStorage } from "@/lib/features/team/active-team-preference-storage";

const preference = { userId: "user-1", teamId: "team-1" };

const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    items,
  };
};

const throwingStorage = () => {
  const fail = () => {
    throw new Error("storage denied");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
};

describe("active team preference storage", () => {
  it("loads what was saved, and nothing after clear", () => {
    const backing = memoryStorage();
    const storage = createActiveTeamPreferenceStorage(() => backing);

    storage.save(preference);
    expect(storage.load()).toEqual({ version: 1, ...preference });

    storage.clear();
    expect(storage.load()).toBeNull();
  });

  it("returns the same reference until the stored value changes", () => {
    const backing = memoryStorage();
    const storage = createActiveTeamPreferenceStorage(() => backing);
    storage.save(preference);

    const first = storage.load();
    expect(storage.load()).toBe(first);

    storage.save({ ...preference, teamId: "team-2" });
    expect(storage.load()).not.toBe(first);
  });

  it("does not touch localStorage at module import on the server", async () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    let reads = 0;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        reads += 1;
        throw new ReferenceError("localStorage is not defined");
      },
    });

    try {
      let imported: { load: () => unknown } | undefined;
      await jest.isolateModulesAsync(async () => {
        const storageModule =
          await import("@/lib/features/team/active-team-preference-storage");
        imported = storageModule.localStorageActiveTeamPreference;
      });

      expect(reads).toBe(0);
      expect(imported!.load()).toBeNull();
      expect(reads).toBeGreaterThan(0);
    } finally {
      if (original) {
        Object.defineProperty(window, "localStorage", original);
      } else {
        delete (window as unknown as { localStorage?: Storage }).localStorage;
      }
    }
  });

  it("notifies subscribers on save and clear, but not when a save changes nothing", () => {
    const backing = memoryStorage();
    const storage = createActiveTeamPreferenceStorage(() => backing);
    const listener = jest.fn();
    const unsubscribe = storage.subscribe(listener);

    storage.save(preference);
    storage.save(preference);
    expect(listener).toHaveBeenCalledTimes(1);

    storage.clear();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    storage.save(preference);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["is not JSON", "{not json"],
    ["has an unknown version", JSON.stringify({ version: 999, ...preference })],
    ["lacks a team", JSON.stringify({ version: 1, userId: "user-1" })],
  ])("treats a stored value that %s as absent and removes it", (_, raw) => {
    const backing = memoryStorage({ "active-team-preference": raw });
    const storage = createActiveTeamPreferenceStorage(() => backing);

    expect(storage.load()).toBeNull();
    expect(backing.items.size).toBe(0);
  });

  it("behaves as an empty store when the storage throws, without throwing", () => {
    const storage = createActiveTeamPreferenceStorage(throwingStorage);
    const listener = jest.fn();
    storage.subscribe(listener);

    expect(storage.load()).toBeNull();
    expect(() => storage.save(preference)).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
    expect(storage.load()).toBeNull();
  });

  it("preserves subscriber errors when storage fails", () => {
    const storage = createActiveTeamPreferenceStorage(throwingStorage);
    storage.subscribe(() => {
      throw new Error("subscriber failed");
    });

    expect(() => storage.clear()).toThrow("subscriber failed");
  });

  it("behaves as an empty store when the storage cannot be reached at all", () => {
    const storage = createActiveTeamPreferenceStorage(() => {
      throw new ReferenceError("localStorage is not defined");
    });

    expect(storage.load()).toBeNull();
    expect(() => storage.save(preference)).not.toThrow();
  });
});
