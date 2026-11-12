import { PlayerStatus } from "@/entities/player";
import { useActiveTeamPreference } from "@/hooks/use-active-team-preference";
import { useActiveTeamId } from "@/hooks/use-data";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { server } from "@test/support/msw/server";
import { SwrIsolation } from "@test/support/react/swr-isolation";

function respondWith({ joinedTeamIds }: { joinedTeamIds: string[] }) {
  server.use(
    http.get("/api/users", () => HttpResponse.json({ id: "user-1" })),
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

describe("useActiveTeamPreference", () => {
  it("does not render a stored preference in the server snapshot", () => {
    localStorage.setItem(
      "active-team-preference",
      JSON.stringify({ version: 1, userId: "user-1", teamId: "team-1" }),
    );
    const PreferenceSnapshot = () => {
      const { preference } = useActiveTeamPreference();
      return createElement("span", null, preference?.teamId ?? "none");
    };

    try {
      expect(renderToString(createElement(PreferenceSnapshot))).toBe(
        "<span>none</span>",
      );
    } finally {
      localStorage.removeItem("active-team-preference");
    }
  });
});

describe("useActiveTeamId", () => {
  it("without a preference, uses the first joined team", async () => {
    const result = await run({ joinedTeamIds: ["team-1", "team-2"] });

    expect(result.current.teamId).toBe("team-1");
  });

  it("returns none when the user has no joined team", async () => {
    const result = await run({ joinedTeamIds: [] });

    expect(result.current.teamId).toBeUndefined();
  });
});
