import { PlayerStatus } from "@/entities/player";
import { useActiveTeamId } from "@/hooks/use-data";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@test/support/msw/server";
import { SwrIsolation } from "@test/support/react/swr-isolation";

function respondWith({
  activeTeamId,
  joinedTeamIds,
}: {
  activeTeamId?: string;
  joinedTeamIds: string[];
}) {
  server.use(
    http.get("/api/users", () => HttpResponse.json({ id: "user-1" })),
    http.get("/api/profiles", () =>
      HttpResponse.json({ id: "profile-1", activeTeamId }),
    ),
    http.get("/api/users/user-1/players", () =>
      HttpResponse.json(
        joinedTeamIds.map((teamId, i) => ({
          id: `player-${i}`,
          teamId,
          status: PlayerStatus.JOINED,
        })),
      ),
    ),
  );
}

const run = async (setup: Parameters<typeof respondWith>[0]) => {
  respondWith(setup);
  const { result } = renderHook(() => useActiveTeamId(), {
    wrapper: SwrIsolation,
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
};

describe("useActiveTeamId", () => {
  it("uses activeTeamId when the user is still a member of that team", async () => {
    const result = await run({
      activeTeamId: "team-2",
      joinedTeamIds: ["team-1", "team-2"],
    });

    expect(result.current.teamId).toBe("team-2");
  });

  it("falls back to the first joined team when activeTeamId is stale", async () => {
    const result = await run({
      activeTeamId: "team-9",
      joinedTeamIds: ["team-1", "team-2"],
    });

    expect(result.current.teamId).toBe("team-1");
  });

  it("returns none when the user has no joined team", async () => {
    const result = await run({ activeTeamId: undefined, joinedTeamIds: [] });

    expect(result.current.teamId).toBeUndefined();
  });
});
