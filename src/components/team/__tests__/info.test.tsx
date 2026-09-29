import TeamInfo from "@/components/team/info";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../../test/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe("TeamInfo", () => {
  it("shows the error state instead of throwing when the team fails to load with 403", async () => {
    server.use(
      http.get("/api/users", () => HttpResponse.json({ id: "user-1" })),
      http.get("/api/teams/team-1", () =>
        HttpResponse.json(
          { code: "AUTHORIZATION", reason: "NOT_TEAM_MEMBER" },
          { status: 403 },
        ),
      ),
      http.get("/api/teams/team-1/players", () => HttpResponse.json([])),
    );

    render(
      <SwrIsolation>
        <TeamInfo teamId="team-1" />
      </SwrIsolation>,
    );

    expect(await screen.findByText("哎呀，發球掛網！")).toBeInTheDocument();
  });
});
