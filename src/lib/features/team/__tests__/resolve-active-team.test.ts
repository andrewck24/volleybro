import {
  decidePreferenceAction,
  resolveActiveTeam,
  type ActiveTeamResolutionInput,
  type PreferenceActionInput,
} from "@/lib/features/team/active-team-preference";

const preference = { version: 1 as const, userId: "user-1", teamId: "team-p" };
const full = {
  profileActiveTeamId: "team-b",
  joinedTeamIds: ["team-a", "team-b"],
};

describe("resolveActiveTeam", () => {
  const resolve = (overrides: Partial<ActiveTeamResolutionInput> = {}) =>
    resolveActiveTeam({
      preference: null,
      userId: undefined,
      preferredTeamStatus: "pending",
      profileActiveTeamId: undefined,
      joinedTeamIds: [],
      ...overrides,
    });

  it("offers the preferred team once its request succeeded and the user matches", () => {
    expect(
      resolve({
        preference,
        userId: "user-1",
        preferredTeamStatus: "confirmed",
        ...full,
      }),
    ).toEqual({ teamId: "team-p", verification: "verified" });
  });

  it.each([
    ["the request has not answered", "user-1", "pending"],
    ["the user has not answered", undefined, "confirmed"],
  ] as const)("offers no team while %s", (_, userId, preferredTeamStatus) => {
    expect(
      resolve({ preference, userId, preferredTeamStatus, ...full }),
    ).toEqual({ teamId: undefined, verification: "pending" });
  });

  it.each([
    ["was written for another user", "user-2", "confirmed"],
    ["was refused", "user-1", "refused"],
    ["failed without a refusal", "user-1", "failed"],
  ] as const)(
    "resolves in full when the preferred team %s",
    (_, userId, preferredTeamStatus) => {
      expect(
        resolve({ preference, userId, preferredTeamStatus, ...full }),
      ).toEqual({ teamId: "team-b", verification: "unused" });
    },
  );

  it("without a preference resolves to the legacy active team while still joined", () => {
    expect(resolve(full)).toEqual({
      teamId: "team-b",
      verification: "unused",
    });
  });

  it("falls back to the first joined team when the legacy one is not joined", () => {
    expect(
      resolve({ profileActiveTeamId: "team-x", joinedTeamIds: ["team-a"] })
        .teamId,
    ).toBe("team-a");
  });

  it("resolves to no team when nothing is joined", () => {
    expect(resolve({ profileActiveTeamId: "team-x" }).teamId).toBeUndefined();
  });
});

describe("decidePreferenceAction", () => {
  const decide = (overrides: Partial<PreferenceActionInput> = {}) =>
    decidePreferenceAction({
      preference: null,
      userId: "user-1",
      preferredTeamStatus: "pending",
      teamId: "team-b",
      loadedTeamId: "team-b",
      ...overrides,
    });
  const keep = { type: "keep" };

  it.each([
    ["was written for another user", "user-2", "confirmed"],
    ["was refused", "user-1", "refused"],
  ] as const)(
    "discards a preference whose team %s",
    (_, userId, preferredTeamStatus) => {
      expect(decide({ preference, userId, preferredTeamStatus })).toEqual({
        type: "discard",
      });
    },
  );

  it.each(["pending", "confirmed", "failed"] as const)(
    "keeps a preference whose request is %s, even when another team has loaded",
    (preferredTeamStatus) => {
      expect(decide({ preference, preferredTeamStatus })).toEqual(keep);
    },
  );

  it("keeps a preference while the user is unknown", () => {
    expect(
      decide({
        preference,
        userId: undefined,
        preferredTeamStatus: "confirmed",
      }),
    ).toEqual(keep);
  });

  it("without a preference stores the resolved team once it has loaded for a known user", () => {
    expect(decide()).toEqual({
      type: "store",
      userId: "user-1",
      teamId: "team-b",
    });
  });

  it.each([
    ["has not loaded", { loadedTeamId: undefined }],
    ["is not the one that loaded", { loadedTeamId: "team-a" }],
    ["does not exist", { teamId: undefined, loadedTeamId: undefined }],
    ["belongs to an unknown user", { userId: undefined }],
  ] as const)(
    "without a preference stores nothing when the team %s",
    (_, o) => {
      expect(decide(o)).toEqual(keep);
    },
  );
});
