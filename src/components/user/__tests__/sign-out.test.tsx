import User from "@/components/user";
import { useActiveTeamId } from "@/hooks/use-data";
import { authClient } from "@/lib/auth-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { createTeam, createUser } from "@test/support/fixtures/entities";
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

  it("clears SWR cache before clearing active-team preference", async () => {
    seedActiveTeamPreference("user-1", "team-1");
    const cache = new Map([
      ["/api/users", { data: createUser({ id: "user-1" }) }],
    ]);
    let cacheAtPreferenceClear: { data?: unknown } | undefined;
    const removeItem = Storage.prototype.removeItem;
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === "active-team-preference") {
        cacheAtPreferenceClear = cache.get("/api/users");
      }
      return removeItem.call(this, key);
    });
    let atSignOut: unknown = "unset";
    let atNavigation: unknown = "unset";
    (authClient.signOut as jest.Mock).mockImplementation(async () => {
      atSignOut = storedActiveTeamPreference();
    });
    mockRouterPush.mockImplementation(() => {
      atNavigation = storedActiveTeamPreference();
    });

    render(
      <SwrIsolation cache={cache as never}>
        <User />
      </SwrIsolation>,
    );
    await userEvent.click(screen.getByRole("button", { name: "登出" }));

    await waitFor(() => expect(mockRouterPush).toHaveBeenCalled());
    expect(cacheAtPreferenceClear?.data).toBeUndefined();
    expect(atSignOut).toBeNull();
    expect(atNavigation).toBeNull();
  });

  it("S8: the preference is not saved again while sign-out is still in progress, next to a consumer of the active team", async () => {
    seedActiveTeamPreference("user-1", "team-1");
    answerTeamRequests({
      joinedTeamIds: ["team-2", "team-1"],
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
