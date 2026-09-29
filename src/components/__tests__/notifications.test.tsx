import Notifications from "@/components/notifications";
import { PlayerStatus } from "@/entities/player";
import { useActiveTeamId } from "@/hooks/use-data";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";

import { server } from "@test/support/msw/server";

const GUIDE = "歡迎使用 VolleyBro !";

// Renders once the hook has finished loading, so an absent guide is a
// decision and not a response that has not arrived yet.
const Settled = () => {
  const { isLoading } = useActiveTeamId();
  return isLoading ? null : <p>settled</p>;
};

const renderNotifications = () =>
  render(
    <SwrIsolation>
      <Notifications />
      <Settled />
    </SwrIsolation>,
  );

const serve = (players: { teamId: string; status: PlayerStatus }[]) =>
  server.use(
    http.get("/api/users", () => HttpResponse.json({ id: "u1" })),
    http.get("/api/profiles", () => HttpResponse.json({})),
    http.get("/api/users/u1/players", () => HttpResponse.json(players)),
  );

describe("Notifications", () => {
  it("shows the new-user guide when the user has no joined team", async () => {
    serve([]);

    renderNotifications();

    expect(await screen.findByText(GUIDE)).toBeInTheDocument();
  });

  it("does not show the new-user guide when the user has another joined team", async () => {
    serve([{ teamId: "team-1", status: PlayerStatus.JOINED }]);

    renderNotifications();

    await screen.findByText("settled");
    expect(screen.queryByText(GUIDE)).not.toBeInTheDocument();
  });

  it("does not show the new-user guide while the active team is still loading", async () => {
    serve([]);
    server.use(
      http.get("/api/users", async () => {
        await delay(50);
        return HttpResponse.json({ id: "u1" });
      }),
    );

    renderNotifications();

    expect(screen.queryByText(GUIDE)).not.toBeInTheDocument();
    expect(await screen.findByText(GUIDE)).toBeInTheDocument();
  });
});
