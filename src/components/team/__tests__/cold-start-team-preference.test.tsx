import { ActionButton } from "@/components/layout/nav/action-button";
import { TeamSwitcher } from "@/components/team/team-switcher";
import { Toaster } from "@/components/ui/toaster";
import { SWRProvider } from "@/components/layout/swr-provider";
import { useActiveTeamId, useTeam } from "@/hooks/use-data";
import { useSWRConfig } from "swr";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";

import { createTeam, createUser } from "@test/support/fixtures/entities";
import { deferred } from "@test/support/gates";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { server } from "@test/support/msw/server";
import {
  ACTIVE_TEAM_PREFERENCE_KEY,
  seedActiveTeamPreference,
  storedActiveTeamPreference,
  storedPreferenceOf,
} from "@test/support/storage/active-team-preference";
import { SwrIsolation } from "@test/support/react/swr-isolation";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const ColdStart = () => {
  const { teamId, isLoading } = useActiveTeamId();
  return (
    <>
      <output aria-label="active team">{teamId}</output>
      <output aria-label="active team loading">{String(isLoading)}</output>
      <TeamSwitcher teamId={teamId ?? ""} />
      <ActionButton teamId={teamId} />
    </>
  );
};

const RevalidateTeam = ({ teamId }: { teamId: string }) => {
  const { mutate } = useSWRConfig();
  const { error } = useTeam(teamId);
  return (
    <>
      <button onClick={() => mutate(`/api/teams/${teamId}`)}>revalidate</button>
      <output aria-label="team error">{error ? "failed" : ""}</output>
    </>
  );
};

const renderColdStart = (extra?: ReactNode) =>
  render(
    <SwrIsolation>
      <ColdStart />
      {extra}
    </SwrIsolation>,
  );

const activeTeam = () => screen.getByLabelText("active team");
const isLoading = () => screen.getByLabelText("active team loading");

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe("cold start with an active team preference", () => {
  it("resolves the nav team from the device preference on cold start", async () => {
    seedActiveTeamPreference("user-1", "team-1");
    const gates = {
      user: deferred(),
      players: deferred(),
      team: deferred(),
    };
    const { arrived, answered } = answerTeamRequests({
      teams: [createTeam({ id: "team-1", name: "真實隊" })],
      gates: {
        user: gates.user.promise,
        players: gates.players.promise,
        team: gates.team.promise,
      },
    });

    renderColdStart();

    await waitFor(() => expect(arrived).toContain("/api/teams/team-1"));
    expect(answered).not.toContain("/api/users");
    expect(answered).not.toContain("/api/users/user-1/players");
    expect(screen.queryByText("真實隊")).not.toBeInTheDocument();

    gates.team.release();
    await waitFor(() => expect(answered).toContain("/api/teams/team-1"));
    expect(activeTeam()).toBeEmptyDOMElement();
    expect(isLoading()).toHaveTextContent("true");

    gates.user.release();
    await waitFor(() => expect(activeTeam()).toHaveTextContent("team-1"));
    expect(isLoading()).toHaveTextContent("false");
    expect(await screen.findByText("真實隊")).toBeVisible();
  });

  it("S2: the new Game dialog opens on the form, not a skeleton, once the preferred team and its players were preloaded", async () => {
    seedActiveTeamPreference("user-1", "team-1");
    const { answered } = answerTeamRequests();
    const user = userEvent.setup();
    renderColdStart();
    await waitFor(() => {
      expect(answered).toContain("/api/teams/team-1/players");
      expect(screen.getByRole("button", { name: "新增賽事" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "新增賽事" }));

    expect(screen.getByText("新增賽事紀錄")).toBeVisible();
  });

  it("S3: a refused preferred team is discarded and the full resolution's team is stored", async () => {
    seedActiveTeamPreference("user-1", "team-gone");
    answerTeamRequests({
      teams: [createTeam({ id: "team-2" })],
    });

    renderColdStart();

    await waitFor(() =>
      expect(storedActiveTeamPreference()).toEqual(
        storedPreferenceOf("user-1", "team-2"),
      ),
    );
    expect(activeTeam()).toHaveTextContent("team-2");
  });

  it("does not show a global error toast when the preferred team refuses membership", async () => {
    seedActiveTeamPreference("user-1", "team-gone");
    answerTeamRequests({ teams: [createTeam({ id: "team-2", name: "乙隊" })] });
    server.use(
      http.get("/api/teams/team-gone", () =>
        HttpResponse.json(
          { code: "AUTHORIZATION", reason: "NOT_A_MEMBER" },
          { status: 403 },
        ),
      ),
    );

    render(
      <SwrIsolation>
        <SWRProvider>
          <ColdStart />
          <Toaster />
        </SWRProvider>
      </SwrIsolation>,
    );

    expect(await screen.findByText("乙隊")).toBeVisible();
    await waitFor(() =>
      expect(storedActiveTeamPreference()).toEqual(
        storedPreferenceOf("user-1", "team-2"),
      ),
    );
    const notifications = screen.getByRole("region", {
      name: /Notifications/,
    });
    expect(
      within(notifications).queryByText("發生未預期的錯誤"),
    ).not.toBeInTheDocument();
  });

  it("S4: a preference written for another user is discarded and the answering user's team is stored", async () => {
    seedActiveTeamPreference("user-A", "team-A");
    answerTeamRequests({
      user: createUser({ id: "user-B" }),
      teams: [
        createTeam({ id: "team-A" }),
        createTeam({ id: "team-B", name: "B隊" }),
      ],
      joinedTeamIds: ["team-B"],
    });

    renderColdStart();

    await waitFor(() =>
      expect(storedActiveTeamPreference()).toEqual(
        storedPreferenceOf("user-B", "team-B"),
      ),
    );
    expect(await screen.findByText("B隊")).toBeVisible();
  });

  describe("S5: without a usable preference", () => {
    it.each([
      ["absent", () => undefined],
      [
        "unrecognizable",
        () => localStorage.setItem(ACTIVE_TEAM_PREFERENCE_KEY, "{not json"),
      ],
    ])(
      "resolves in full and stores the team only after it has loaded (%s)",
      async (_, arrange) => {
        arrange();
        const team = deferred();
        const { answered } = answerTeamRequests({
          teams: [createTeam({ id: "team-1", name: "真實隊" })],
          gates: { team: team.promise },
        });

        renderColdStart();
        await waitFor(() =>
          expect(answered).toContain("/api/users/user-1/players"),
        );
        await waitFor(() => expect(activeTeam()).toHaveTextContent("team-1"));

        expect(storedActiveTeamPreference()).toBeNull();
        team.release();
        await waitFor(() =>
          expect(storedActiveTeamPreference()).toEqual(
            storedPreferenceOf("user-1", "team-1"),
          ),
        );
      },
    );

    it("resolves in full when the storage throws", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage denied");
      });
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("storage denied");
      });
      answerTeamRequests({
        teams: [createTeam({ id: "team-1", name: "真實隊" })],
      });

      renderColdStart();

      expect(await screen.findByText("真實隊")).toBeVisible();
      expect(isLoading()).toHaveTextContent("false");
    });
  });
});

it("S3: a failure to ask the preferred team leaves the stored preference as it was while the fallback team is shown", async () => {
  seedActiveTeamPreference("user-1", "team-1");
  answerTeamRequests({
    joinedTeamIds: ["team-2", "team-1"],
    teams: [
      createTeam({ id: "team-1" }),
      createTeam({ id: "team-2", name: "乙隊" }),
    ],
  });
  server.use(http.get("/api/teams/team-1", () => HttpResponse.error()));

  renderColdStart();

  expect(await screen.findByText("乙隊")).toBeVisible();
  expect(activeTeam()).toHaveTextContent("team-2");
  expect(storedActiveTeamPreference()).toEqual(
    storedPreferenceOf("user-1", "team-1"),
  );
});

describe("a verified preference when its team is revalidated", () => {
  const verifyPreferredTeam = async (
    joinedTeamIds: string[] = ["team-2", "team-1"],
  ) => {
    seedActiveTeamPreference("user-1", "team-1");
    answerTeamRequests({
      teams: [createTeam({ id: "team-1" }), createTeam({ id: "team-2" })],
      joinedTeamIds,
    });
    renderColdStart(<RevalidateTeam teamId="team-1" />);
    await waitFor(() => expect(activeTeam()).toHaveTextContent("team-1"));
    await waitFor(() => expect(isLoading()).toHaveTextContent("false"));
  };

  it("S3 (revalidation): keeps the team and the preference when the revalidation fails without a refusal", async () => {
    await verifyPreferredTeam();
    server.use(http.get("/api/teams/team-1", () => HttpResponse.error()));

    await userEvent.click(screen.getByRole("button", { name: "revalidate" }));
    await waitFor(() =>
      expect(screen.getByLabelText("team error")).toHaveTextContent("failed"),
    );

    expect(activeTeam()).toHaveTextContent("team-1");
    expect(storedActiveTeamPreference()).toMatchObject({ teamId: "team-1" });
  });

  it("S3 (revalidation): does not store a refused team again while the players list still lists it first", async () => {
    await verifyPreferredTeam(["team-1", "team-2"]);
    server.use(
      http.get("/api/teams/team-1", () =>
        HttpResponse.json(
          { code: "AUTHORIZATION", reason: "NOT_A_MEMBER" },
          { status: 403 },
        ),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "revalidate" }));

    await waitFor(() =>
      expect(screen.getByLabelText("team error")).toHaveTextContent("failed"),
    );
    expect(storedActiveTeamPreference()).toBeNull();
  });

  it("S3 (revalidation): discards the preference when the revalidation is refused", async () => {
    await verifyPreferredTeam();
    server.use(
      http.get("/api/teams/team-1", () =>
        HttpResponse.json(
          { code: "AUTHORIZATION", reason: "NOT_A_MEMBER" },
          { status: 403 },
        ),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "revalidate" }));

    await waitFor(() =>
      expect(storedActiveTeamPreference()).toMatchObject({ teamId: "team-2" }),
    );
    expect(activeTeam()).toHaveTextContent("team-2");
  });
});
