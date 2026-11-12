import { z } from "zod";

export const ACTIVE_TEAM_PREFERENCE_VERSION = 1;

export type ActiveTeamPreference = {
  version: typeof ACTIVE_TEAM_PREFERENCE_VERSION;
  userId: string;
  teamId: string;
};

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

export const parseActiveTeamPreference = (
  raw: unknown,
): ActiveTeamPreference | null => {
  const result = ActiveTeamPreferenceSchema.safeParse(raw);
  return result.success ? result.data : null;
};

type PreferredTeamStatus = "pending" | "confirmed" | "refused" | "failed";

export type PreferenceState = {
  preference: ActiveTeamPreference | null;
  userId: string | undefined;
  preferredTeamStatus: PreferredTeamStatus;
};

export type ActiveTeamResolutionInput = PreferenceState & {
  joinedTeamIds: string[];
};

export type ActiveTeamResolution =
  | { verification: "pending"; teamId: undefined }
  | { verification: "verified"; teamId: string }
  | { verification: "unused"; teamId: string | undefined };

const isPreferenceRejected = ({
  preference,
  userId,
  preferredTeamStatus,
}: PreferenceState) =>
  !!preference &&
  ((userId !== undefined && preference.userId !== userId) ||
    preferredTeamStatus === "refused");

export const resolveActiveTeam = (
  input: ActiveTeamResolutionInput,
): ActiveTeamResolution => {
  const { preference, userId, preferredTeamStatus } = input;
  if (
    !preference ||
    isPreferenceRejected(input) ||
    preferredTeamStatus === "failed"
  ) {
    return { teamId: input.joinedTeamIds[0], verification: "unused" };
  }
  if (preferredTeamStatus === "confirmed" && userId !== undefined) {
    return { teamId: preference.teamId, verification: "verified" };
  }
  return { teamId: undefined, verification: "pending" };
};

export type PreferenceAction =
  | { type: "keep" }
  | { type: "discard" }
  | { type: "store"; userId: string; teamId: string };

export type PreferenceActionInput = PreferenceState & {
  teamId: string | undefined;
  loadedTeamId: string | undefined;
};

export const decidePreferenceAction = (
  input: PreferenceActionInput,
): PreferenceAction => {
  const { preference, userId, teamId, loadedTeamId } = input;
  if (isPreferenceRejected(input)) return { type: "discard" };
  if (preference || userId === undefined) return { type: "keep" };
  if (!teamId || teamId !== loadedTeamId) return { type: "keep" };
  return { type: "store", userId, teamId };
};
