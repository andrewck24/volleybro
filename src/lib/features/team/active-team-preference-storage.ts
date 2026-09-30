import {
  ACTIVE_TEAM_PREFERENCE_VERSION,
  parseActiveTeamPreference,
  type ActiveTeamPreference,
  type ActiveTeamPreferenceStorage,
} from "@/lib/features/team/active-team-preference";

const ACTIVE_TEAM_PREFERENCE_KEY = "active-team-preference";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const createActiveTeamPreferenceStorage = (
  getStorage: () => StorageLike,
): ActiveTeamPreferenceStorage => {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const readRaw = (): string | null => {
    try {
      return getStorage().getItem(ACTIVE_TEAM_PREFERENCE_KEY);
    } catch {
      return null;
    }
  };

  const removeRaw = () => {
    try {
      getStorage().removeItem(ACTIVE_TEAM_PREFERENCE_KEY);
    } catch {}
  };

  const parseRaw = (raw: string): ActiveTeamPreference | null => {
    try {
      return parseActiveTeamPreference(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  // useSyncExternalStore compares `load` results by reference, so parsing on
  // every call would re-render forever.
  let cachedRaw: string | null = null;
  let cachedPreference: ActiveTeamPreference | null = null;

  return {
    load() {
      const raw = readRaw();
      if (raw === cachedRaw) return cachedPreference;
      cachedRaw = raw;
      cachedPreference = raw === null ? null : parseRaw(raw);
      if (raw !== null && cachedPreference === null) removeRaw();
      return cachedPreference;
    },
    save(preference) {
      const raw = JSON.stringify({
        version: ACTIVE_TEAM_PREFERENCE_VERSION,
        ...preference,
      });
      if (raw === readRaw()) return;
      try {
        getStorage().setItem(ACTIVE_TEAM_PREFERENCE_KEY, raw);
      } catch {
        return;
      }
      notify();
    },
    clear() {
      removeRaw();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

// Resolved on each call so importing this module on the server never touches
// `localStorage`; a getter that throws there is handled as an empty store.
export const localStorageActiveTeamPreference =
  createActiveTeamPreferenceStorage(() => localStorage);
