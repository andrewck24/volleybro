import { createPlayer } from "@test/support/fixtures/entities";
import TeamInfo from "@/components/team/info/index";
import { Toaster } from "@/components/ui/toaster";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@test/support/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const currentPlayer = createPlayer({ name: "Current User" });

function serveTeamAndLeave(leave: () => Response) {
  server.use(
    http.get("/api/users", () =>
      HttpResponse.json({ id: "user-1", name: "Current User" }),
    ),
    http.get("/api/teams/team-1", () =>
      HttpResponse.json({ id: "team-1", name: "Test Team", nickname: "TT" }),
    ),
    http.get("/api/teams/team-1/players", () =>
      HttpResponse.json([currentPlayer]),
    ),
    http.patch(`/api/players/${currentPlayer.id}/invitations`, leave),
  );
}

async function attemptLeave() {
  const user = userEvent.setup();
  render(
    <SwrIsolation>
      <TeamInfo teamId="team-1" />
      <Toaster />
    </SwrIsolation>,
  );
  await user.click(await screen.findByRole("button", { name: "離開隊伍" }));
  await user.click(screen.getByRole("button", { name: "確認離開" }));
}

describe("AlertDialog error state — TeamInfo handleLeaveTeam", () => {
  it("should show inline error message when leave team fails", async () => {
    serveTeamAndLeave(() =>
      HttpResponse.json(
        { code: "AUTHORIZATION", reason: "OWNER_CANNOT_LEAVE" },
        { status: 403 },
      ),
    );

    await attemptLeave();

    expect(
      await screen.findByText("請先把擁有權移轉給其他成員，再離開"),
    ).toBeInTheDocument();
    expect(screen.getByText("確定要離開這個隊伍嗎？")).toBeInTheDocument();
  });

  it("should show branded message for server errors", async () => {
    serveTeamAndLeave(() =>
      HttpResponse.json(
        { code: "UNEXPECTED", reason: "UNHANDLED_ERROR" },
        { status: 500 },
      ),
    );

    await attemptLeave();

    expect(await screen.findByText(/伺服器暫時無法處理/)).toBeInTheDocument();
  });
});
