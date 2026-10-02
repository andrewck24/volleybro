import { localStorageActiveTeamPreference as storage } from "@/lib/features/team/active-team-preference-storage";
import { useSyncExternalStore } from "react";

// The server snapshot is null so the prerendered HTML never contains the
// stored team; the client swaps it in after hydration.
export const useActiveTeamPreference = () => ({
  preference: useSyncExternalStore(storage.subscribe, storage.load, () => null),
  save: storage.save,
  clear: storage.clear,
});
