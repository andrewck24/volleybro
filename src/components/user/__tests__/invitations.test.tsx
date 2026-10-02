import { Invitations } from "@/components/user/invitations/index";
import { PlayerStatus } from "@/entities/player";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@test/support/msw/server";
import {
  storedActiveTeamPreference,
  storedPreferenceOf,
} from "@test/support/storage/active-team-preference";
import { deferred } from "@test/support/gates";

const invited = [
  {
    id: "player-1",
    teamId: "team-1",
    teamName: "Team team-1",
    status: PlayerStatus.INVITED,
  },
  {
    id: "player-2",
    teamId: "team-2",
    teamName: "Team team-2",
    status: PlayerStatus.INVITED,
  },
];

function renderInvitations() {
  server.use(
    http.get("/api/users", () => HttpResponse.json({ id: "user-1" })),
    http.get("/api/users/user-1/players", () => HttpResponse.json(invited)),
  );
  render(
    <SwrIsolation>
      <Invitations />
    </SwrIsolation>,
  );
}

// Holds the response until the test releases it, so the request stays in flight.
function holdInvitationResponse(playerId: string) {
  const requests: { body: unknown }[] = [];
  const { promise, release } = deferred();
  server.use(
    http.patch(`/api/players/${playerId}/invitations`, async ({ request }) => {
      requests.push({ body: await request.json() });
      await promise;
      return HttpResponse.json({});
    }),
  );
  return { release, requests };
}

describe("Invitations processingId state", () => {
  it("shows the team name of each invitation", async () => {
    renderInvitations();

    expect(await screen.findByText("Team team-1")).toBeInTheDocument();
    expect(screen.getByText("Team team-2")).toBeInTheDocument();
  });

  it("does not render a link covering the invitation row", async () => {
    renderInvitations();
    await screen.findByText("Team team-1");

    expect(
      screen.queryByRole("link", { name: "前往隊伍" }),
    ).not.toBeInTheDocument();
  });

  it("disables all buttons while one invitation is processing and re-enables them after", async () => {
    const { release, requests } = holdInvitationResponse("player-1");

    const user = userEvent.setup();
    renderInvitations();

    const acceptButtons = await screen.findAllByRole("button", {
      name: /接受邀請/,
    });
    const rejectButtons = screen.getAllByRole("button", { name: /拒絕邀請/ });

    await user.click(acceptButtons[0]!);

    expect(acceptButtons[0]).toBeDisabled();
    expect(rejectButtons[0]).toBeDisabled();
    expect(acceptButtons[1]).toBeDisabled();
    expect(rejectButtons[1]).toBeDisabled();
    expect(requests).toEqual([{ body: { action: "accept" } }]);

    release();
    await waitFor(() => expect(acceptButtons[0]).toBeEnabled());
    expect(acceptButtons[1]).toBeEnabled();
  });

  it("marks only the clicked invitation's buttons as loading while processing", async () => {
    const { release } = holdInvitationResponse("player-1");

    const user = userEvent.setup();
    renderInvitations();

    const acceptButtons = await screen.findAllByRole("button", {
      name: /接受邀請/,
    });
    await user.click(acceptButtons[0]!);

    expect(acceptButtons[0]).toHaveAttribute("aria-busy", "true");
    expect(acceptButtons[1]).not.toHaveAttribute("aria-busy");

    release();
    await waitFor(() =>
      expect(acceptButtons[0]).not.toHaveAttribute("aria-busy"),
    );
  });
});

describe("Invitations acceptance", () => {
  beforeEach(() => localStorage.clear());

  it("S7: accepting an invitation stores the joined team as the preference", async () => {
    server.use(
      http.patch("/api/players/player-2/invitations", () =>
        HttpResponse.json({}),
      ),
    );
    const user = userEvent.setup();
    renderInvitations();

    const acceptButtons = await screen.findAllByRole("button", {
      name: /接受邀請/,
    });
    await user.click(acceptButtons[1]!);

    await waitFor(() =>
      expect(storedActiveTeamPreference()).toEqual(
        storedPreferenceOf("user-1", "team-2"),
      ),
    );
  });
});
