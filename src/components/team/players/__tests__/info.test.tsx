import { PlayerInfo } from "@/components/team/players/info";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@test/support/msw/server";

const TEAM_ID = "507f1f77bcf86cd799439011";
const PLAYER_ID = "507f1f77bcf86cd799439012";

const player = {
  id: PLAYER_ID,
  name: "Alice",
  teamId: TEAM_ID,
  role: PlayerRole.ADMIN,
  status: PlayerStatus.JOINED,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

function renderWithOwner(ownerPlayerId: string) {
  server.use(
    http.get(`/api/players/${PLAYER_ID}`, () => HttpResponse.json(player)),
    http.get(`/api/teams/${TEAM_ID}`, () =>
      HttpResponse.json({
        id: TEAM_ID,
        name: "Team",
        lineups: [],
        ownerPlayerId,
      }),
    ),
  );
  render(
    <SwrIsolation>
      <PlayerInfo teamId={TEAM_ID} playerId={PLAYER_ID} />
    </SwrIsolation>,
  );
}

describe("PlayerInfo", () => {
  it("badges the team's owner as the owner, not by their admin role", async () => {
    renderWithOwner(PLAYER_ID);
    expect(await screen.findByText("擁有者")).toBeInTheDocument();
  });

  it("badges any other admin by their role", async () => {
    renderWithOwner("507f1f77bcf86cd799439099");
    await screen.findByText("Alice");
    expect(await screen.findByText("管理員")).toBeInTheDocument();
    expect(screen.queryByText("擁有者")).not.toBeInTheDocument();
  });
});
