export const ACTIVE_TEAM_PREFERENCE_KEY = "active-team-preference";

export const seedActiveTeamPreference = (userId: string, teamId: string) =>
  localStorage.setItem(
    ACTIVE_TEAM_PREFERENCE_KEY,
    JSON.stringify({ version: 1, userId, teamId }),
  );

export const storedActiveTeamPreference = () => {
  const raw = localStorage.getItem(ACTIVE_TEAM_PREFERENCE_KEY);
  return raw === null ? null : JSON.parse(raw);
};

export const storedPreferenceOf = (userId: string, teamId: string) => ({
  version: 1,
  userId,
  teamId,
});
