import { z } from "zod";

export const ACTIVE_TEAM_PREFERENCE_VERSION = 1;

/** Which team this device shows, bound to the user it was written for. See ADR-0098 and ADR-0099. */
export type ActiveTeamPreference = {
  version: typeof ACTIVE_TEAM_PREFERENCE_VERSION;
  userId: string;
  teamId: string;
};

/** Synchronous and never throwing: a failing store is an empty one. `subscribe` also fires for this tab's own writes. */
export type ActiveTeamPreferenceStorage = {
  load(): ActiveTeamPreference | null;
  save(preference: Omit<ActiveTeamPreference, "version">): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
};

const ActiveTeamPreferenceSchema = z.object({
  version: z.literal(ACTIVE_TEAM_PREFERENCE_VERSION),
  userId: z.string(),
  teamId: z.string(),
});

/** Anything unrecognisable, including an unknown version, is `null`. */
export const parseActiveTeamPreference = (
  raw: unknown,
): ActiveTeamPreference | null => {
  const result = ActiveTeamPreferenceSchema.safeParse(raw);
  return result.success ? result.data : null;
};

/** What the preferred team's own request has said so far. */
type PreferredTeamStatus = "pending" | "confirmed" | "refused" | "failed";

export type PreferenceState = {
  preference: ActiveTeamPreference | null;
  /** Undefined until `useUser` has answered. */
  userId: string | undefined;
  /** `refused`: not a member. `failed`: it could not be asked (network, server, or the user request). */
  preferredTeamStatus: PreferredTeamStatus;
};

export type ActiveTeamResolutionInput = PreferenceState & {
  /** The server's legacy `profile.activeTeamId`. */
  profileActiveTeamId: string | undefined;
  joinedTeamIds: string[];
};

export type ActiveTeamResolution = {
  teamId: string | undefined;
  /** `pending`: no team offered yet. `verified`: the preference's team. `unused`: the full resolution's team. */
  verification: "pending" | "verified" | "unused";
};

const isPreferenceRejected = ({
  preference,
  userId,
  preferredTeamStatus,
}: PreferenceState) =>
  !!preference &&
  ((userId !== undefined && preference.userId !== userId) ||
    preferredTeamStatus === "refused");

/**
 * A preference is trusted only once its team request succeeded and the
 * answered user is the one it was written for; until then no team is offered.
 * Without a usable preference the legacy active team is used while still
 * joined, otherwise the first joined team.
 */
export const resolveActiveTeam = (
  input: ActiveTeamResolutionInput,
): ActiveTeamResolution => {
  const { preference, userId, preferredTeamStatus } = input;
  if (
    !preference ||
    isPreferenceRejected(input) ||
    preferredTeamStatus === "failed"
  ) {
    const { profileActiveTeamId, joinedTeamIds } = input;
    const teamId =
      profileActiveTeamId && joinedTeamIds.includes(profileActiveTeamId)
        ? profileActiveTeamId
        : joinedTeamIds[0];
    return { teamId, verification: "unused" };
  }
  if (preferredTeamStatus === "confirmed" && userId !== undefined) {
    return { teamId: preference.teamId, verification: "verified" };
  }
  return { teamId: undefined, verification: "pending" };
};

/** What to do with the stored preference. */
export type PreferenceAction =
  | { type: "keep" }
  | { type: "discard" }
  | { type: "store"; userId: string; teamId: string };

export type PreferenceActionInput = PreferenceState & {
  /** The team `resolveActiveTeam` chose. */
  teamId: string | undefined;
  /** The team whose data has been received, if any. */
  loadedTeamId: string | undefined;
};

/**
 * A refused request or another user discards the preference. A preference
 * that is not rejected is never replaced, whatever else is unknown. Without
 * one, the resolved team is stored once its data has loaded for a known user.
 */
export const decidePreferenceAction = (
  input: PreferenceActionInput,
): PreferenceAction => {
  const { preference, userId, teamId, loadedTeamId } = input;
  if (isPreferenceRejected(input)) return { type: "discard" };
  if (preference || userId === undefined) return { type: "keep" };
  if (!teamId || teamId !== loadedTeamId) return { type: "keep" };
  return { type: "store", userId, teamId };
};
