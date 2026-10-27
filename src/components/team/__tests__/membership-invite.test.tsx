import { MembershipSection } from "@/components/team/players/membership-section";
import { PlayerStatus } from "@/entities/player";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@test/support/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

it("searches for an invitee in the current team", async () => {
  server.use(
    http.get("/api/users", ({ request }) => {
      const params = new URL(request.url).searchParams;
      return params.get("teamId") === "team-1" &&
        params.get("email") === "alice@example.com"
        ? HttpResponse.json({ id: "user-1", name: "Alice" })
        : new HttpResponse(null, { status: 403 });
    }),
  );
  render(
    <SwrIsolation>
      <MembershipSection
        teamId="team-1"
        isCurrentOwner={false}
        isSelf={false}
        player={{
          id: "player-1",
          name: "Player",
          teamId: "team-1",
          status: PlayerStatus.NONE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
      />
    </SwrIsolation>,
  );
  await userEvent.type(screen.getByLabelText("電子郵件"), "alice@example.com");
  await userEvent.click(screen.getByRole("button", { name: "搜尋" }));
  expect(await screen.findByText("Alice")).toBeInTheDocument();
});
