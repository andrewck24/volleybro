import { renderHook, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { http, HttpResponse } from "msw";
import { Toaster } from "@/components/ui/toaster";
import { SWRProvider } from "@/components/layout/swr-provider";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";
import { SwrIsolation } from "@test/support/react/swr-isolation";

import { server } from "@test/support/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

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

it("isolates SWR cache state between renders", async () => {
  let response = { id: "team-first" };
  server.use(
    http.get("/api/teams/cache-isolation", () => HttpResponse.json(response)),
  );

  const { result: firstResult, unmount } = renderHook(
    () => useTeam("cache-isolation"),
    {
      wrapper: SwrIsolation,
    },
  );
  await waitFor(() => expect(firstResult.current.team).toEqual(response));
  unmount();

  response = { id: "team-second" };
  const { result: secondResult } = renderHook(
    () => useTeam("cache-isolation"),
    {
      wrapper: SwrIsolation,
    },
  );

  await waitFor(() => expect(secondResult.current.team).toEqual(response));
});

it("shows the global error toast when a regular team request fails", async () => {
  server.use(
    http.get("/api/teams/toast-error", () =>
      HttpResponse.json({ code: "UNEXPECTED" }, { status: 500 }),
    ),
  );

  renderHook(() => useTeam("toast-error"), {
    wrapper: ({ children }) =>
      createElement(
        SWRProvider,
        null,
        createElement(SwrIsolation, null, children),
        createElement(Toaster),
      ),
  });

  expect(await screen.findByRole("status")).toBeVisible();
});
