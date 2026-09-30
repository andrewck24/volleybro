import User from "@/components/user";
import { useActiveTeamId } from "@/hooks/use-data";
import { authClient } from "@/lib/auth-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import {
  createProfile,
  createTeam,
  createUser,
} from "@test/support/fixtures/entities";
import { deferred } from "@test/support/gates";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { server } from "@test/support/msw/server";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import {
  seedActiveTeamPreference,
  storedActiveTeamPreference,
} from "@test/support/storage/active-team-preference";

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: { signOut: jest.fn() },
}));

// The nav bar sits next to the user page and keeps resolving the active team.
const ActiveTeam = () => {
  const { teamId } = useActiveTeamId();
  return <output aria-label="active team">{teamId}</output>;
};

afterEach(() => jest.restoreAllMocks());

describe("User sign-out", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRouterPush.mockReset();
    server.use(http.get("/api/users", () => HttpResponse.json(createUser())));
  });

  it("S8: the active team preference is gone from storage before the session ends and the app navigates", async () => {
    seedActiveTeamPreference("user-1", "team-1");
    let atSignOut: unknown = "unset";
    let atNavigation: unknown = "unset";
    (authClient.signOut as jest.Mock).mockImplementation(async () => {
      atSignOut = storedActiveTeamPreference();
    });
    mockRouterPush.mockImplementation(() => {
      atNavigation = storedActiveTeamPreference();
    });

    render(
      <SwrIsolation>
        <User />
      </SwrIsolation>,
    );
    await userEvent.click(screen.getByRole("button", { name: "登出" }));

    await waitFor(() => expect(mockRouterPush).toHaveBeenCalled());
    expect(atSignOut).toBeNull();
    expect(atNavigation).toBeNull();
  });

  it("S8: the preference is not saved again while sign-out is still in progress, next to a consumer of the active team", async () => {
    seedActiveTeamPreference("user-1", "team-1");
    answerTeamRequests({
      profile: createProfile({ activeTeamId: "team-2" }),
      teams: [createTeam({ id: "team-1" }), createTeam({ id: "team-2" })],
    });
    const signOut = deferred();
    (authClient.signOut as jest.Mock).mockImplementation(() => signOut.promise);
    render(
      <SwrIsolation>
        <User />
        <ActiveTeam />
      </SwrIsolation>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("active team")).toHaveTextContent("team-1"),
    );
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    await userEvent.click(screen.getByRole("button", { name: "登出" }));
    await waitFor(() => expect(authClient.signOut).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByLabelText("active team")).toBeEmptyDOMElement(),
    );
    signOut.release();

    await waitFor(() => expect(mockRouterPush).toHaveBeenCalled());
    expect(setItem).not.toHaveBeenCalled();
    expect(storedActiveTeamPreference()).toBeNull();
  });
});
