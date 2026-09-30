import Home from "@/components/home";
import { SWRProvider } from "@/components/layout/swr-provider";
import { Toaster } from "@/components/ui/toaster";
import { render, screen, waitFor } from "@testing-library/react";

import {
  createProfile,
  createTeam,
  createUser,
} from "@test/support/fixtures/entities";
import { deferred } from "@test/support/gates";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { seedActiveTeamPreference } from "@test/support/storage/active-team-preference";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const renderHome = () =>
  render(
    <SwrIsolation>
      <SWRProvider>
        <Home />
        <Toaster />
      </SWRProvider>
    </SwrIsolation>,
  );

describe("Home on a cold start with an active team preference", () => {
  beforeEach(() => localStorage.clear());

  it("S3 (Home): a refused preferred team shows no error and no request is made for its games", async () => {
    seedActiveTeamPreference("user-1", "team-gone");
    const { arrived, answered } = answerTeamRequests({
      profile: createProfile({ activeTeamId: "team-2" }),
      teams: [createTeam({ id: "team-2" })],
    });

    renderHome();

    await waitFor(() => expect(arrived).toContain("/api/games?ti=team-2"));
    expect(answered).toContain("/api/teams/team-gone");
    expect(arrived).not.toContain("/api/games?ti=team-gone");
    expect(screen.queryAllByRole("status")).toHaveLength(0);
  });

  it("S4 (Home): another user who belongs to the preferred team is not shown its games before the user answers", async () => {
    seedActiveTeamPreference("user-A", "team-A");
    const user = deferred();
    const { arrived, answered } = answerTeamRequests({
      user: createUser({ id: "user-B" }),
      profile: createProfile({ userId: "user-B", activeTeamId: "team-B" }),
      teams: [createTeam({ id: "team-A" }), createTeam({ id: "team-B" })],
      gates: { user: user.promise },
    });

    renderHome();
    await waitFor(() => expect(answered).toContain("/api/teams/team-A"));
    expect(arrived).not.toContain("/api/games?ti=team-A");

    user.release();

    await waitFor(() => expect(arrived).toContain("/api/games?ti=team-B"));
    expect(arrived).not.toContain("/api/games?ti=team-A");
  });
});
