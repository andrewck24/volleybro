import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { SwrIsolation } from "@/test-utils/swr-isolation";

import { server } from "../../../test/msw/server";

const cases = [
  {
    name: "useTeam",
    path: (id: string) => `/api/teams/${id}`,
    body: { id: "team-123" },
    run: (id: string) => {
      const { result } = renderHook(() => useTeam(id), {
        wrapper: SwrIsolation,
      });
      return {
        read: () => result.current.team,
        state: () => result.current,
      };
    },
  },
  {
    name: "useTeamPlayers",
    path: (id: string) => `/api/teams/${id}/players`,
    body: [{ id: "p1" }],
    run: (id: string) => {
      const { result } = renderHook(() => useTeamPlayers(id), {
        wrapper: SwrIsolation,
      });
      return {
        read: () => result.current.players,
        state: () => result.current,
      };
    },
  },
];

describe.each(cases)("$name", (hook) => {
  const recordRequests = () => {
    const paths: string[] = [];
    server.use(
      http.get(/\/api\/teams\/.*/, ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(hook.body);
      }),
    );
    return paths;
  };

  it.each([
    ["an empty string", ""],
    ["undefined", undefined as unknown as string],
  ])("sends no request when the team id is %s", async (_label, id) => {
    const paths = recordRequests();

    const rendered = hook.run(id);
    // Give a request, if one were made, time to reach the handler.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(paths).toEqual([]);
    expect(rendered.read()).toBeUndefined();
    expect(rendered.state().error).toBeUndefined();
    expect(rendered.state().isLoading).toBe(false);
  });

  it("requests the team's own URL and returns the response", async () => {
    const paths = recordRequests();

    const rendered = hook.run("team-123");

    await waitFor(() => expect(rendered.read()).toEqual(hook.body));
    expect(paths).toEqual([hook.path("team-123")]);
  });
});
