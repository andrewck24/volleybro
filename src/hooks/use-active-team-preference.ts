import { localStorageActiveTeamPreference as storage } from "@/lib/features/team/active-team-preference-storage";
import { useSyncExternalStore } from "react";

export const useActiveTeamPreference = () => ({
  preference: useSyncExternalStore(storage.subscribe, storage.load, () => null),
  save: storage.save,
  clear: storage.clear,
});
